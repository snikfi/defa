type MonitoringPayload = {
  level: 'error';
  type: 'window.error' | 'window.unhandledrejection';
  message: string;
  stack?: string;
  path: string;
  userAgent: string;
  timestamp: string;
};

let initialized = false;

function postMonitoringEvent(payload: MonitoringPayload) {
  const webhookUrl = import.meta.env.VITE_MONITORING_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(webhookUrl, blob);
    return;
  }

  void fetch(webhookUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });
}

export function initMonitoring() {
  if (initialized || typeof window === 'undefined') {
    return;
  }

  initialized = true;

  window.addEventListener('error', (event) => {
    const payload: MonitoringPayload = {
      level: 'error',
      type: 'window.error',
      message: event.message || 'Unknown window error',
      stack: event.error instanceof Error ? event.error.stack : undefined,
      path: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    postMonitoringEvent(payload);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'Unhandled promise rejection';
    const stack = reason instanceof Error ? reason.stack : undefined;

    const payload: MonitoringPayload = {
      level: 'error',
      type: 'window.unhandledrejection',
      message,
      stack,
      path: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    postMonitoringEvent(payload);
  });
}
