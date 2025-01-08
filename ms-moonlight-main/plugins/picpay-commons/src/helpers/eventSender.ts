type EventParams = {
  category?: string;
  label?: string;
  action?: string;
  value?: number;
} & Record<string, string | number>;

interface CustomWindow extends Window {
  gtag?: (...args: any[]) => void;
}

export const sendEvent = (name: string, params: EventParams) => {
  const gtag = (window as CustomWindow)?.gtag;

  const { action, category, label, value } = params;

  gtag?.('event', name, {
    event_category: category,
    event_label: label,
    event_action: action,
    value,
  });
};
