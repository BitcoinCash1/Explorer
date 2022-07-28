export const formatterXAxis = (
  locale: string,
  windowPreference: string,
  value: string | number
) => {
  if (typeof value === 'string' && value.length === 0) {
    return null;
  }

  const date = new Date(value);
  switch (windowPreference) {
    case '2h':
      return date.toLocaleTimeString(locale, { hour: 'numeric', minute: 'numeric' });
    case '24h':
    case '3d':
    case '1w':
    case '1m':
    case '3m':
    case '6m':
    case '1y':
      return date.toLocaleTimeString(locale, { month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    case '2y':
    case '3y':
    case 'all':
      return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  }
};

export const formatterXAxisLabel = (
  locale: string,
  windowPreference: string,
) => {
  const date = new Date();
  switch (windowPreference) {
    case '2h':
    case '24h':
      return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
    case '3d':
    case '1w':
      return date.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
    case '1m':
    case '3m':
    case '6m':
      return date.toLocaleDateString(locale, { year: 'numeric' });
    case '1y':
    case '2y':
    case '3y':
      return null;
  }
};

export const formatterXAxisTimeCategory = (
  locale: string,
  windowPreference: string,
  value: number
) => {
  const date = new Date(value);
  switch (windowPreference) {
    case '2h':
      return date.toLocaleTimeString(locale, { hour: 'numeric', minute: 'numeric' });
    case '24h':
      return date.toLocaleTimeString(locale, { weekday: 'short', hour: 'numeric' });
    case '3d':
    case '1w':
      return date.toLocaleTimeString(locale, { month: 'short', day: 'numeric', hour: 'numeric' });
    case '1m':
    case '3m':
      return date.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
    case '6m':
    case '1y':
      return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
    case '2y':
    case '3y':
    case 'all':
      return date.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
  }
};

export const download = (href, name) => {
  const a = document.createElement('a');
  a.download = name;
  a.href = href;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export function detectWebGL() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  return (gl && gl instanceof WebGLRenderingContext);
}

export function getFlagEmoji(countryCode) {
  if (!countryCode) {
    return '';
  }
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char =>  127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

export const easingFuncs = {
  linear: function (k) {
    return k;
  },
  quadraticIn: function (k) {
    return k * k;
  },
  quadraticOut: function (k) {
    return k * (2 - k);
  },
  quadraticInOut: function (k) {
    if ((k *= 2) < 1) {
      return 0.5 * k * k;
    }
    return -0.5 * (--k * (k - 2) - 1);
  },
  cubicIn: function (k) {
    return k * k * k;
  },
  cubicOut: function (k) {
    return --k * k * k + 1;
  },
  cubicInOut: function (k) {
    if ((k *= 2) < 1) {
      return 0.5 * k * k * k;
    }
    return 0.5 * ((k -= 2) * k * k + 2);
  },
  quarticIn: function (k) {
    return k * k * k * k;
  },
  quarticOut: function (k) {
    return 1 - --k * k * k * k;
  },
  quarticInOut: function (k) {
    if ((k *= 2) < 1) {
      return 0.5 * k * k * k * k;
    }
    return -0.5 * ((k -= 2) * k * k * k - 2);
  },
  quinticIn: function (k) {
    return k * k * k * k * k;
  },
  quinticOut: function (k) {
    return --k * k * k * k * k + 1;
  },
  quinticInOut: function (k) {
    if ((k *= 2) < 1) {
      return 0.5 * k * k * k * k * k;
    }
    return 0.5 * ((k -= 2) * k * k * k * k + 2);
  },
  sinusoidalIn: function (k) {
    return 1 - Math.cos((k * Math.PI) / 2);
  },
  sinusoidalOut: function (k) {
    return Math.sin((k * Math.PI) / 2);
  },
  sinusoidalInOut: function (k) {
    return 0.5 * (1 - Math.cos(Math.PI * k));
  },
  exponentialIn: function (k) {
    return k === 0 ? 0 : Math.pow(1024, k - 1);
  },
  exponentialOut: function (k) {
    return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
  },
  exponentialInOut: function (k) {
    if (k === 0) {
      return 0;
    }
    if (k === 1) {
      return 1;
    }
    if ((k *= 2) < 1) {
      return 0.5 * Math.pow(1024, k - 1);
    }
    return 0.5 * (-Math.pow(2, -10 * (k - 1)) + 2);
  },
  circularIn: function (k) {
    return 1 - Math.sqrt(1 - k * k);
  },
  circularOut: function (k) {
    return Math.sqrt(1 - --k * k);
  },
  circularInOut: function (k) {
    if ((k *= 2) < 1) {
      return -0.5 * (Math.sqrt(1 - k * k) - 1);
    }
    return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
  },
  elasticIn: function (k) {
    var s;
    var a = 0.1;
    var p = 0.4;
    if (k === 0) {
      return 0;
    }
    if (k === 1) {
      return 1;
    }
    if (!a || a < 1) {
      a = 1;
      s = p / 4;
    } else {
      s = (p * Math.asin(1 / a)) / (2 * Math.PI);
    }
    return -(
      a *
      Math.pow(2, 10 * (k -= 1)) *
      Math.sin(((k - s) * (2 * Math.PI)) / p)
    );
  },
  elasticOut: function (k) {
    var s;
    var a = 0.1;
    var p = 0.4;
    if (k === 0) {
      return 0;
    }
    if (k === 1) {
      return 1;
    }
    if (!a || a < 1) {
      a = 1;
      s = p / 4;
    } else {
      s = (p * Math.asin(1 / a)) / (2 * Math.PI);
    }
    return (
      a * Math.pow(2, -10 * k) * Math.sin(((k - s) * (2 * Math.PI)) / p) + 1
    );
  },
  elasticInOut: function (k) {
    var s;
    var a = 0.1;
    var p = 0.4;
    if (k === 0) {
      return 0;
    }
    if (k === 1) {
      return 1;
    }
    if (!a || a < 1) {
      a = 1;
      s = p / 4;
    } else {
      s = (p * Math.asin(1 / a)) / (2 * Math.PI);
    }
    if ((k *= 2) < 1) {
      return (
        -0.5 *
        (a *
          Math.pow(2, 10 * (k -= 1)) *
          Math.sin(((k - s) * (2 * Math.PI)) / p))
      );
    }
    return (
      a *
        Math.pow(2, -10 * (k -= 1)) *
        Math.sin(((k - s) * (2 * Math.PI)) / p) *
        0.5 +
      1
    );
  },
  // 在某一动画开始沿指示的路径进行动画处理前稍稍收回该动画的移动
  backIn: function (k) {
    var s = 1.70158;
    return k * k * ((s + 1) * k - s);
  },
  backOut: function (k) {
    var s = 1.70158;
    return --k * k * ((s + 1) * k + s) + 1;
  },
  backInOut: function (k) {
    var s = 1.70158 * 1.525;
    if ((k *= 2) < 1) {
      return 0.5 * (k * k * ((s + 1) * k - s));
    }
    return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
  },
  // 创建弹跳效果
  bounceIn: function (k) {
    return 1 - easingFuncs.bounceOut(1 - k);
  },
  bounceOut: function (k) {
    if (k < 1 / 2.75) {
      return 7.5625 * k * k;
    } else if (k < 2 / 2.75) {
      return 7.5625 * (k -= 1.5 / 2.75) * k + 0.75;
    } else if (k < 2.5 / 2.75) {
      return 7.5625 * (k -= 2.25 / 2.75) * k + 0.9375;
    } else {
      return 7.5625 * (k -= 2.625 / 2.75) * k + 0.984375;
    }
  },
  bounceInOut: function (k) {
    if (k < 0.5) {
      return easingFuncs.bounceIn(k * 2) * 0.5;
    }
    return easingFuncs.bounceOut(k * 2 - 1) * 0.5 + 0.5;
  }
};