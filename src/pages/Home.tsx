import React from 'react';

import { Home as HomePage } from '@ui';

/**
 * The project step of a multi-project build (`use_root_point`): the root navigator mounts it as the first
 * screen only then, and only a signed-out launch reaches it. It goes on to Login by route name.
 */
export const Home = (props: any) => {
  const homeProps = {
    ...props,
    onNavigationRedirect: (page: string, params: any) => {
      if (!page) return;
      props.navigation.navigate(page, params);
    },
  };

  return <HomePage {...homeProps} />;
};

export default Home;
