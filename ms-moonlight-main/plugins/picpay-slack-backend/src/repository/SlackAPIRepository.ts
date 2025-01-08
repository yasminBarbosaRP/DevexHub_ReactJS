export interface SlackAPIRepository {
  sendMessage(channelId: string, message: string, blocks?: any[]): Promise<void>;
  getChannelId(channelName: string): Promise<string>;
  getUserIdByEmail(email: string): Promise<string>;
}