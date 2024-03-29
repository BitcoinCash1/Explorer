# Bitcoin Cash Explorer Setup

Separate readme for setting-up the Explorer for **Bitcoin Cash** (`BCH`). BCH Explorer is a fork from the mempool project, adjusted for BCH (and soon as also support cash token, cash fusion and other BCH specific features).

## Frontend Setup

Use the following frontend configuration file (`mempool-frontend-config.json`) to configure Bitcoin Cash (`BCH`) as the mempool site.

To configure Bitcoin Cash Explorer execute: `npm run config:defaults:mempool.cash`.

Or alternatively manually create the `mempool-frontend-config.json` file inside the [frontend](frontend) sub-directory, with the following content:

```js
{
  "TESTNET_ENABLED": false,
  "SIGNET_ENABLED": false,
  "LIQUID_ENABLED": false,
  "LIQUID_TESTNET_ENABLED": false,
  "BISQ_ENABLED": false,
  "BISQ_SEPARATE_BACKEND": false,
  "ITEMS_PER_PAGE": 25,
  "BLOCK_WEIGHT_UNITS": 4000000,
  "BASE_MODULE": "mempool.cash",
  "MINING_DASHBOARD": true,
  "LIGHTNING": false
}
```

## Backend Setup

For the backend use the following `mempool-config.json` file:

```js
{
  "MEMPOOL": {
    "NETWORK": "mainnet",
    "BACKEND": "electrum",
    "ENABLED": true,
    "HTTP_PORT": 8999,
    "SPAWN_CLUSTER_PROCS": 0,
    "API_URL_PREFIX": "/api/v1/",
    "POLL_RATE_MS": 1000,
    "CACHE_DIR": "./cache",
    "CLEAR_PROTECTION_MINUTES": 5,
    "RECOMMENDED_FEE_PERCENTILE": 50,
    "INITIAL_BLOCKS_AMOUNT": 8,
    "MEMPOOL_BLOCKS_AMOUNT": 8,
    "INDEXING_BLOCKS_AMOUNT": -1,
    "BLOCKS_SUMMARIES_INDEXING": true,
    "BLOCK_LIMIT_SIZE_BYTES": 32000000,
    "PRICE_FEED_UPDATE_INTERVAL": 600,
    "USE_SECOND_NODE_FOR_MINFEE": false,
    "EXTERNAL_ASSETS": [],
    "EXTERNAL_MAX_RETRY": 1,
    "EXTERNAL_RETRY_INTERVAL": 0,
    "USER_AGENT": "mempool",
    "STDOUT_LOG_MIN_PRIORITY": "debug",
    "AUTOMATIC_BLOCK_REINDEXING": false,
    "POOLS_JSON_URL": "https://raw.githubusercontent.com/BitcoinCash1/mining-pools/master/pools.json",
    "POOLS_JSON_TREE_URL": "https://api.github.com/repos/BitcoinCash1/mining-pools/git/trees/master",
    "ADVANCED_TRANSACTION_SELECTION": false
  },
  "CORE_RPC": {
    "HOST": "127.0.0.1",
    "PORT": 8332,
    "USERNAME": "mempool",
    "PASSWORD": "secret"
  },
  "ELECTRUM": {
    "HOST": "127.0.0.1",
    "PORT": 50001,
    "TLS_ENABLED": false
  },
  "ESPLORA": {
    "REST_API_URL": "http://127.0.0.1:3000"
  },
  "SECOND_CORE_RPC": {
    "HOST": "127.0.0.1",
    "PORT": 8332,
    "USERNAME": "mempool",
    "PASSWORD": "mempool"
  },
  "DATABASE": {
    "ENABLED": true,
    "HOST": "127.0.0.1",
    "PORT": 3306,
    "SOCKET": "/var/run/mysqld/mysqld.sock",
    "DATABASE": "mempool",
    "USERNAME": "mempool",
    "PASSWORD": "your_password"
  },
  "SYSLOG": {
    "ENABLED": true,
    "HOST": "127.0.0.1",
    "PORT": 514,
    "MIN_PRIORITY": "debug",
    "FACILITY": "local7"
  },
  "STATISTICS": {
    "ENABLED": true,
    "TX_PER_SECOND_SAMPLE_PERIOD": 150
  },
  "MAXMIND": {
    "ENABLED": false,
    "GEOLITE2_CITY": "/usr/local/share/GeoIP/GeoLite2-City.mmdb",
    "GEOLITE2_ASN": "/usr/local/share/GeoIP/GeoLite2-ASN.mmdb",
    "GEOIP2_ISP": "/usr/local/share/GeoIP/GeoIP2-ISP.mmdb"
  },
  "BISQ": {
    "ENABLED": false,
    "DATA_PATH": "/bisq/statsnode-data/btc_mainnet/db"
  },
  "LIGHTNING": {
    "ENABLED": false,
    "BACKEND": "lnd",
    "STATS_REFRESH_INTERVAL": 600,
    "GRAPH_REFRESH_INTERVAL": 600,
    "LOGGER_UPDATE_INTERVAL": 30,
    "FORENSICS_INTERVAL": 43200
  },
  "LND": {
    "TLS_CERT_PATH": "tls.cert",
    "MACAROON_PATH": "readonly.macaroon",
    "REST_API_URL": "https://localhost:8080"
  },
  "CLIGHTNING": {
    "SOCKET": "lightning-rpc"
  },
  "SOCKS5PROXY": {
    "ENABLED": false,
    "USE_ONION": true,
    "HOST": "127.0.0.1",
    "PORT": 9050,
    "USERNAME": "",
    "PASSWORD": ""
  },
  "PRICE_DATA_SERVER": {
    "TOR_URL": "",
    "CLEARNET_URL": "https://finance.melroy.org/v1"
  },
  "EXTERNAL_DATA_SERVER": {
    "MEMPOOL_API": "https://mempool.space/api/v1",
    "MEMPOOL_ONION": "http://mempoolhqx4isw62xs7abwphsq7ldayuidyx2v2oethdhhj6mlo2r6ad.onion/api/v1",
    "LIQUID_API": "https://liquid.network/api/v1",
    "LIQUID_ONION": "http://liquidmom47f6s3m53ebfxn47p76a6tlnxib3wp6deux7wuzotdr6cyd.onion/api/v1",
    "BISQ_URL": "https://bisq.markets/api",
    "BISQ_ONION": "http://bisqmktse2cabavbr2xjq7xw3h6g5ottemo5rolfcwt6aly6tp5fdryd.onion/api"
  }
}
```

After you created the `mempool-config.json` file, we can build the backend (using `npm run build`) _OR_ use the pre-build [Docker image](https://hub.docker.com/r/danger89/bch-explorer-backend). In this example we will leverage Docker in order to run the BCH Explorer backend.

I'm using [Docker compose](https://docs.docker.com/compose/) to start the Docker container, and mount the correct files/folders.

Next, we will create a `bch-explorer-compose.yml` file (chang the left side of the mounting volumes to your needs):

```yml
version: "3"
services:
  bch-explorer-backend:
    image: danger89/bch-explorer-backend
    container_name: bch-explorer-backend
    restart: always
    networks:
      - bch_explorer_external_network
    volumes:
      - /home/folder_to/mempool-config.json:/backend/mempool-config.json
      - /home/folder_to/bch-explorer-cache:/backend/cache
      - /var/run/mysqld/mysqld.sock:/run/mysqld/mysqld.sock
    ports:
      - "127.0.0.1:8999:8999"
    extra_hosts:
      - "host.docker.internal:host-gateway"

networks:
  bch_explorer_external_network:
```

To start the Docker container, use: `docker-compose --file bch-explorer-compose.yml up -d` (omit the `-d` if you do **NOT** want to start the service in the background).

_Note 1:_ As you can see, I run the service in `host` network mode, but you can also create a dedicated Docker bridge network. In that case, be sure you are able to connect [Fulcrum](https://github.com/cculianu/Fulcrum) and [BCHN full node](https://bitcoincashnode.org) services as well.

_Note 2:_ I'm using the MariaDB (MySQL) server on my host machine, you can also create a dedicated database docker container (eg. using [mariadb image](https://hub.docker.com/_/mariadb)) in the Docker compose config, and connect the two services.

## Deployment Setup

We still use MySQL (MariaDB) as the database to index our data, just like the [upstream project](https://github.com/mempool/mempool).

But we use the [BCHN full node](https://bitcoincashnode.org) software as your Bitcoin Cash full-node. Furthermore, in order to lookup addresses you need to have an Electrum server backend, we use [Fulcrum](https://github.com/cculianu/Fulcrum) as our Bitcoin Cash SPV server.

## Update from Upstream / File Overlap

**Background:** I'm trying to create as less of a file overlap as possible, making rebasing / remote fetch as easy as possible with the [upstream repo](https://github.com/mempool/mempool).  
Therefore I created separate [Angular Components](frontend/src/app/components) (with `-bch` suffix in the name) designed specifically for Bitcoin Cash, leaving the BTC code intact as well. Itry to do the same for the backend code.

#### Frontend file overlap

Files that _do_ have file overlap in the frontend (`frontend` folder) are:

- `src/app/app-routing.module.ts`
- `src/app/components/block/block.component.ts`
- `src/app/docs/docs/docs.component.ts`
- `src/app/shared/pipes/bytes-pipe/bytes.pipe.ts` (trying to fix this file upstream)
- `src/app/shared/shared.module.ts`
- `src/app/app.module.ts`
- `src/favicon.ico`
- `src/resources/favicons`
- `sync-assets.js`

#### Backend file overlap

Files that _do_ have file overlap in the backend (`backend` folder) are:

- `src/config.ts`
- `src/index.ts`
- `src/indexer.ts`
- `src/rpc-api/index.ts`
- `src/__fixtures__/mempool-config.template.json`
- `src/__tests__/config.test.ts`

#### General file overlap

- `README.md`

### Update with upstream

**IMPORTANT:** We want our changes to be on-top of the upstream commits. Meaning we only do `git rebase` from upstream. This will result into a clean git history / commit history, where all the upstream mempool changes are below our additional BCH commit(s).

In order to achieve this, you need to execute the following steps:

1. Add the upstream repo: `git remote add upstream https://github.com/mempool/mempool.git`
2. Switch to the `master` branch: `git checkout master`
3. Update master branch info from remote upstream using: `git pull upstream`
4. Update our master branch with the upstream changes: `git rebase upstream/master`
5. Push the local `master` the our remote server: `git push`
6. Now we switch to the `bch` branch: `git checkout bch`
7. So now it's important to do a **rebase** as well, within the `bch` branch: `git rebase master`
8. Validate & test the changes with our Bitcoin Cash configuration, the rebase could after all breaks some stuff.
9. Finally, push the latest changes of the `bch` branch to the server. This will require a _force_ rewrite of git history.  
   **!!Extra Attention Required!!!** If you break the code/remove BCH code accidentally or something else stupid during this process. A git force push will remove the data FOREVER. This is therefore no longer irreversible!

   ```sh
   git push -f
   ```

That's it!
