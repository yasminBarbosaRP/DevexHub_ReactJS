import React, { MouseEventHandler, useEffect, useState } from 'react';
import useCopyToClipboard from 'react-use/lib/useCopyToClipboard';
import { SidebarItem } from '@backstage/core-components';
import VpnKeyIcon from '@material-ui/icons/VpnKey';
import Tooltip from '@material-ui/core/Tooltip';
import {
  errorApiRef,
  identityApiRef,
  useApi,
} from '@backstage/core-plugin-api';

export const CopyMoonlightToken = () => {
  const [tokenMoonlight, setTokenMoonlight] = useState<string>('');
  const [open, setOpen] = useState(false);
  const errorApi = useApi(errorApiRef);
  const [{ error }, copyToClipboard] = useCopyToClipboard();
  const identityApi = useApi(identityApiRef);

  useEffect(() => {
    if (error) {
      errorApi.post(error);
    }
  }, [error, errorApi]);

  useEffect(() => {
    (async (): Promise<void> => {
      const { token } = await identityApi.getCredentials();

      if (!token) {
        return;
      }
      setTokenMoonlight(token);
    })();
  }, [identityApi]);

  const handleCopyClick: MouseEventHandler = e => {
    e.stopPropagation();
    setOpen(true);

    if (tokenMoonlight === undefined) {
      return;
    }
    copyToClipboard(tokenMoonlight);

    /**
     * The LeaveDelay tooltip is not working correctly here,
     * and for this reason I added setTimeout
     */
    setTimeout(() => {
      setOpen(false);
    }, 1000);
  };

  return (
    <>
      {tokenMoonlight !== '' && (
        <Tooltip
          id="copy-moonlight-token"
          title="Moonlight Token Successfully Copied"
          placement="right"
          open={open}
        >
          <SidebarItem
            onClick={handleCopyClick}
            icon={VpnKeyIcon}
            text="Copy Token"
          />
        </Tooltip>
      )}
    </>
  );
};
