import express from 'express';
import { Application, Request, Response, NextFunction } from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import cluster from 'cluster';
import DB from './database';
import config from './config';
import blocks from './api/blocks-bch';
import memPool from './api/mempool-bch';
import diskCache from './api/disk-cache';
import statistics from './api/statistics-cash/statistics';
import websocketHandler from './api/websocket-handler-bch';
import fiatConversion from './api/fiat-conversion-bch';
import logger from './logger';
import backendInfo from './api/backend-info';
import loadingIndicators from './api/loading-indicators';
import databaseMigrationBch from './api/database-migration-bch';
import syncAssets from './sync-assets';
import { Common } from './api/common-bch';
import poolsUpdater from './tasks/pools-updater';
import indexerBch from './indexer-bch';
import statisticsRoutes from './api/statistics-cash/statistics.routes';
import miningRoutes from './api/mining-cash/mining-routes';
import bitcoinRoutes from './api/bitcoin-cash/bitcoin.routes';

class Server {
  private wss: WebSocket.Server | undefined;
  private server: http.Server | undefined;
  private app: Application;
  private currentBackendRetryInterval = 5;

  constructor() {
    this.app = express();

    if (!config.MEMPOOL.SPAWN_CLUSTER_PROCS) {
      this.startServer();
      return;
    }

    if (cluster.isPrimary) {
      logger.notice(`Mempool Server (Master) is running on port ${config.MEMPOOL.HTTP_PORT} (${backendInfo.getShortCommitHash()})`);

      const numCPUs = config.MEMPOOL.SPAWN_CLUSTER_PROCS;
      for (let i = 0; i < numCPUs; i++) {
        const env = { workerId: i };
        const worker = cluster.fork(env);
        worker.process['env'] = env;
      }

      cluster.on('exit', (worker, code, signal) => {
        const workerId = worker.process['env'].workerId;
        logger.warn(`Mempool Worker PID #${worker.process.pid} workerId: ${workerId} died. Restarting in 10 seconds... ${signal || code}`);
        setTimeout(() => {
          const env = { workerId: workerId };
          const newWorker = cluster.fork(env);
          newWorker.process['env'] = env;
        }, 10000);
      });
    } else {
      this.startServer(true);
    }
  }

  async startServer(worker = false): Promise<void> {
    logger.notice(`Starting Mempool Server${worker ? ' (worker)' : ''}... (${backendInfo.getShortCommitHash()})`);

    this.app
      .use((req: Request, res: Response, next: NextFunction) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        next();
      })
      .use(express.urlencoded({ extended: true }))
      .use(express.text({ type: ['text/plain', 'application/base64'] }))
      ;

    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });

    this.setUpWebsocketHandling();

    await syncAssets.syncAssets$();
    if (config.MEMPOOL.ENABLED) {
      diskCache.loadMempoolCache();
    }

    if (config.DATABASE.ENABLED) {
      await DB.checkDbConnection();
      try {
        if (process.env.npm_config_reindex !== undefined) { // Re-index requests
          const tables = process.env.npm_config_reindex.split(',');
          logger.warn(`Indexed data for "${process.env.npm_config_reindex}" tables will be erased in 5 seconds (using '--reindex')`);
          await Common.sleep$(5000);
          await databaseMigrationBch.$truncateIndexedData(tables);
        }
        await databaseMigrationBch.$initializeOrMigrateDatabase();
        if (Common.indexingEnabled()) {
          await indexerBch.$resetHashratesIndexingState();
        }
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : 'Error');
      }
    }

    if (config.STATISTICS.ENABLED && config.DATABASE.ENABLED && cluster.isPrimary) {
      statistics.startStatistics();
    }

    fiatConversion.startService();

    this.setUpHttpApiRoutes();

    if (config.MEMPOOL.ENABLED) {
      this.runMainUpdateLoop();
    }

    this.server.listen(config.MEMPOOL.HTTP_PORT, () => {
      if (worker) {
        logger.info(`Mempool Server worker #${process.pid} started`);
      } else {
        logger.notice(`Mempool Server is running on port ${config.MEMPOOL.HTTP_PORT}`);
      }
    });
  }

  async runMainUpdateLoop(): Promise<void> {
    try {
      try {
        await memPool.$updateMemPoolInfo();
      } catch (e) {
        const msg = `updateMempoolInfo: ${(e instanceof Error ? e.message : e)}`;
        if (config.MEMPOOL.USE_SECOND_NODE_FOR_MINFEE) {
          logger.warn(msg);
        } else {
          logger.debug(msg);
        }
      }
      await poolsUpdater.updatePoolsJson();
      await blocks.$updateBlocks();
      await memPool.$updateMempool();
      indexerBch.$run();

      setTimeout(this.runMainUpdateLoop.bind(this), config.MEMPOOL.POLL_RATE_MS);
      this.currentBackendRetryInterval = 5;
    } catch (e) {
      const loggerMsg = `runMainLoop error: ${(e instanceof Error ? e.message : e)}. Retrying in ${this.currentBackendRetryInterval} sec.`;
      if (this.currentBackendRetryInterval > 5) {
        logger.warn(loggerMsg);
        memPool.setOutOfSync();
      } else {
        logger.debug(loggerMsg);
      }
      logger.debug(JSON.stringify(e));
      if (e instanceof Error) {
        console.debug(e.stack);
      }
      setTimeout(this.runMainUpdateLoop.bind(this), 1000 * this.currentBackendRetryInterval);
      this.currentBackendRetryInterval *= 2;
      this.currentBackendRetryInterval = Math.min(this.currentBackendRetryInterval, 60);
    }
  }

  setUpWebsocketHandling(): void {
    if (this.wss) {
      websocketHandler.setWebsocketServer(this.wss);
    }
    websocketHandler.setupConnectionHandling();
    if (config.MEMPOOL.ENABLED) {
      statistics.setNewStatisticsEntryCallback(websocketHandler.handleNewStatistic.bind(websocketHandler));
      memPool.setAsyncMempoolChangedCallback(websocketHandler.handleMempoolChange.bind(websocketHandler));
      blocks.setNewAsyncBlockCallback(websocketHandler.handleNewBlock.bind(websocketHandler));
    }
    fiatConversion.setProgressChangedCallback(websocketHandler.handleNewConversionRates.bind(websocketHandler));
    loadingIndicators.setProgressChangedCallback(websocketHandler.handleLoadingChanged.bind(websocketHandler));
  }
  
  setUpHttpApiRoutes(): void {
    bitcoinRoutes.initRoutes(this.app);
    if (config.STATISTICS.ENABLED && config.DATABASE.ENABLED && config.MEMPOOL.ENABLED) {
      statisticsRoutes.initRoutes(this.app);
    }
    if (Common.indexingEnabled() && config.MEMPOOL.ENABLED) {
      miningRoutes.initRoutes(this.app);
    }
  }
}

((): Server => new Server())();
