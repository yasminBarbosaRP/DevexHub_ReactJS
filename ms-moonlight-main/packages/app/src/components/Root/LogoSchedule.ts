const currentMonth: number = new Date().getMonth() + 1;
const halloweenMonth: number = 10;
const christmasMonth: number = 12;

type LogoProp = {
  [key: string]: JSX.Element | undefined;
};

const handling = (logo: LogoProp): JSX.Element => {
  if (!logo.default) {
    throw new Error('default logo is not set');
  }

  switch (currentMonth) {
    case halloweenMonth:
      return logo.halloween ?? logo.default;
    case christmasMonth:
      return logo.christmas ?? logo.default;
    default:
      return logo.default;
  }
};

export default handling;
