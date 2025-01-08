import React from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { houstonApiRef } from '../apis';

interface Props {
  children: any;
}

export interface Flags {
  showNewHome?: boolean;
  showtools?: boolean;
  admin_announcements?: boolean;
  show_vision_catalog_tab?: boolean;
  show_history_pipeline?: boolean;
  validate_repo_scaffolder?: boolean;
  show_tekton_tab?: boolean;
  show_register_component_page?: boolean;
  allows_qeta_access?: boolean;
  allows_manage_template?: boolean;
  show_info_backstage?: boolean;
  allows_select_group_to_update?: boolean;
  show_sidebar_metrics?: boolean;
  show_score_testcertified?: boolean;
  show_score_tab?: boolean;
}

export interface Values {
  [name: string]: boolean | string | object | null | undefined;
}

export const HoustonContext = React.createContext<Values>({});

export const useHoustonContext = (): Flags => React.useContext(HoustonContext);

export const HoustonProvider = ({ children }: Props) => {
  const [flags, setFlags] = React.useState<Values>({});

  const api = useApi(houstonApiRef);

  React.useEffect(() => {
    if(process.env.NODE_ENV === 'development'){
      setFlags({
        showNewHome: true,
        showtools: true,
        admin_announcements: true,
        show_vision_catalog_tab: true,
        show_history_pipeline: true,
        validate_repo_scaffolder: true,
        show_tekton_tab: true,
        show_register_component_page: true,
        allows_qeta_access: true,
        allows_manage_template: true,
        show_info_backstage: true,
        allows_select_group_to_update: true,
        show_sidebar_metrics: true,
        show_score_testcertified: true,
        show_score_tab: true,
      })
      return 
    } 
    void api.getFlags().then(resp => setFlags(resp));
  }, [api, setFlags]);

  return (
    <HoustonContext.Provider value={flags}>{children}</HoustonContext.Provider>
  );
};
