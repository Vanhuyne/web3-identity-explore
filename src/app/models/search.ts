export enum SearchPlatform {
  WALLET = 'wallet',
  FARCASTER_USERNAME = 'farcaster-username',
  FARCASTER_FID = 'farcaster-fid',
  TWITTER = 'twitter',
  ZORA = 'zora'
}
export interface SearchQuery {
  platform: SearchPlatform;
  query: string;
}