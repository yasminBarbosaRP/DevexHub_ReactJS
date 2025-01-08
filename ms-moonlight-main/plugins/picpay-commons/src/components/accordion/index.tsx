import React from 'react';
import {
  Typography,
  Accordion as MUIAccordion,
  AccordionSummary,
  AccordionDetails,
} from '@material-ui/core';
import ExpandMore from '@material-ui/icons/ExpandMore';

export const Accordion = (props: any) => {
  const [expanded, setExpanded] = React.useState(true);

  const handleAccordion = () => {
    setExpanded(value => !value);
  };

  return (
    <MUIAccordion expanded={expanded} onChange={handleAccordion}>
      <AccordionSummary
        expandIcon={<ExpandMore />}
        aria-controls="accordion-aria"
        id="accordion-id"
      >
        <Typography>
          <strong>{props.title}</strong>
        </Typography>
      </AccordionSummary>
      <AccordionDetails>{props.children}</AccordionDetails>
    </MUIAccordion>
  );
};
