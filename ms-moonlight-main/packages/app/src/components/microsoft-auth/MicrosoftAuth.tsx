import React from 'react';
import { SignInProviderConfig, SignInPage } from '@backstage/core-components';
import { microsoftAuthApiRef, IdentityApi } from '@backstage/core-plugin-api';

const microsoftProvider: SignInProviderConfig = {
  id: 'microsoft-auth-provider',
  title: 'Welcome to Moonlight',
  message: 'Sign in using Microsoft AD',
  apiRef: microsoftAuthApiRef,
};

export const MicrosoftAuthComponent: any = (props: any) => {
  if (process.env.NODE_ENV === 'development') {
    return (
      <SignInPage
        {...props}
        auto
        providers={['guest', 'custom', microsoftProvider]}
        align="center"
      />
    );
  }

  return (
    <SignInPage
      {...props}
      auto
      align="center"
      provider={microsoftProvider}
      onSignInSuccess={async (identityApi: IdentityApi) => {
        props.onSignInSuccess(identityApi);
      }}
    />
  );
};
