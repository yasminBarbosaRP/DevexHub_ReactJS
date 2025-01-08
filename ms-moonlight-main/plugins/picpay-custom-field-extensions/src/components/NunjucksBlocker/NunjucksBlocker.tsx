import React, { useContext, useEffect } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import { TemplateContext } from '@internal/plugin-picpay-commons';
import { usePrevious } from 'react-use';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@material-ui/core';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';

export const NunjucksBlocker = (
  props: FieldExtensionComponentProps<boolean>,
) => {
  const { onChange, uiSchema, formData } = props;
  const { extractIdentityValue } = useContext(TemplateContext);
  const previous = usePrevious(formData);

  const navigate = useNavigate();
  const alertApi = useApi(alertApiRef);
  const location = useLocation();

  const exp = uiSchema['ui:options']?.expression?.toString() ?? "";
  const blockerMessage = uiSchema['ui:options']?.blockerMessage?.toString() ?? "";
  const redirectTo = extractIdentityValue(uiSchema['ui:options']?.redirectTo as string ?? "");
  const redirectSeconds = uiSchema['ui:options']?.redirectSeconds ?? 10;

  const [open, setOpen] = React.useState(true);
  const [countdown, setCountdown] = React.useState<number>(redirectSeconds as number);
  const isDev = process.env.NODE_ENV === 'development' || location.pathname.includes("/create/edit");

  useEffect(() => {
    setOpen(true);
  }, [redirectTo])

  useEffect(() => {
    const result = extractIdentityValue(exp) === "true";
    onChange(result);
  }, [extractIdentityValue, previous, formData, exp, onChange]);

  useEffect(() => {
    if (redirectTo && formData === false) {
      const timer = setTimeout(() => {
        if (isDev) {
          alertApi.post({
            message: `Redirect to ${redirectTo} avoided in development mode.`,
            severity: 'info',
          });
          return;
        }
        if (redirectTo.startsWith('http') || redirectTo.startsWith('https')) {
          window.location.href = redirectTo;
        } else {
          navigate(redirectTo);
        }
      }, 5000);

      const countdownInterval = setInterval(() => {
        setCountdown((prev) => prev > 0 ? prev - 1 : prev);
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
      };
    }
    return () => { };
  }, [redirectTo, isDev, navigate, alertApi, formData, location.pathname]);


  if (formData === true) return null;

  const renderedMessage = extractIdentityValue(blockerMessage ?? "");

  if (redirectTo) {
    return (
      <Dialog open={open} onClose={() => {
        if (!isDev) return;
        setOpen(false)
      }}>
        <DialogTitle id="responsive-dialog-title">
          You're beeing redirected
        </DialogTitle>
        <DialogContent>
          <p>
            <ReactMarkdown>{renderedMessage}</ReactMarkdown>
          </p>
          <p>
            Redirecting in <b>{countdown}</b> seconds...
          </p>
          <p>
            <i>If you arent redirected by the end of the countdown, click <Link to={redirectTo}>here</Link>.</i>
          </p>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <ReactMarkdown>{renderedMessage}</ReactMarkdown>
    </>
  );
};
