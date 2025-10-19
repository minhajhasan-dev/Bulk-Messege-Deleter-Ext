export type MessageBase<TType extends string, TPayload = unknown> = {
  type: TType;
  payload?: TPayload;
};

export type PingMessage = MessageBase<'PING', { time: number }>; // test connectivity
export type GetLicenseStatusMessage = MessageBase<'GET_LICENSE_STATUS'>;
export type TelemetryEventMessage = MessageBase<'TELEMETRY_EVENT', { event: string; props?: Record<string, unknown> }>; 

export type BackgroundToUIMessage = MessageBase<'LICENSE_STATUS', { status: 'trial' | 'expired' | 'licensed'; daysLeft?: number }>; 

export type AnyOutgoingMessage = PingMessage | GetLicenseStatusMessage | TelemetryEventMessage;
export type AnyIncomingMessage = BackgroundToUIMessage;

export type MessageHandler = (msg: AnyIncomingMessage, sender: chrome.runtime.MessageSender) => void | Promise<void>;
