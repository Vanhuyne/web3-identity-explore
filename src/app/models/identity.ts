export interface SocialInfo {
  verified: boolean | null;
  followers: number;
  following: number;
}

export interface Source {
  id: string;
  platform: string;
  verified: boolean;
}

export interface IdentityProfile {
  id: string;
  platform: string;
  url: string;
  avatar: string | null;
  social: SocialInfo | null;
  username: string | null;
  sources: Source[];
}

export interface GroupedIdentity {
  primary: IdentityProfile | null;
  farcaster: IdentityProfile | null;
  ens: IdentityProfile | null;
  github: IdentityProfile | null;
  twitter: IdentityProfile | null;
  zora: IdentityProfile | null;
  lens: IdentityProfile | null;
  ethereum: IdentityProfile | null;
  solana: IdentityProfile | null;
  basenames: IdentityProfile | null;
  email: IdentityProfile | null;
  website: IdentityProfile | null;
  allProfiles: IdentityProfile[];
}