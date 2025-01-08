import { useCallback, useState } from 'react';
import { Announcement } from '../../api';

export type GithubAnnouncementDialogState = {
  open: (a: Announcement) => void;
  close: () => void;

  isOpen: boolean;
  announcement?: Announcement;
};

export function useGithubAnnouncementDialogState(): GithubAnnouncementDialogState {
  const [state, setState] = useState<{
    open: boolean;
    announcement?: Announcement;
  }>({ open: false });

  const setOpen = useCallback(
    (a: Announcement) => {
      setState({
        open: true,
        announcement: a,
      });
    },
    [setState],
  );

  const setClosed = useCallback(() => {
    setState({
      open: false,
      announcement: undefined,
    });
  }, [setState]);

  return {
    open: setOpen,
    close: setClosed,

    announcement: state.announcement,
    isOpen: state.open,
  };
}
