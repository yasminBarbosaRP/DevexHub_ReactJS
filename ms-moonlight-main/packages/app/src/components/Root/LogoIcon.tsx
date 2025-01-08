/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import handling from './LogoSchedule';

const LogoDefault = (
  <svg
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M1.85 1H19.7869C32.6764 1 40 7.64367 40 19.7663C40 32.1999 32.6764 39 19.7869 39H1.85C0.828272 39 0 38.1717 0 37.15V2.85001C0 1.82828 0.828275 1 1.85 1ZM0.387873 11.5909V28.5H6.46458V18.6364C6.46458 18.1446 6.54531 17.7227 6.70677 17.3704C6.87556 17.0108 7.11041 16.7356 7.41131 16.5447C7.71221 16.3539 8.07182 16.2585 8.49015 16.2585C9.1213 16.2585 9.62402 16.4714 9.99831 16.897C10.3726 17.3153 10.5597 17.8951 10.5597 18.6364V28.5H16.3722V18.6364C16.3722 17.8951 16.5521 17.3153 16.9117 16.897C17.2786 16.4714 17.774 16.2585 18.3978 16.2585C19.029 16.2585 19.5317 16.4714 19.906 16.897C20.2803 17.3153 20.4674 17.8951 20.4674 18.6364V28.5H26.5441V17.0952C26.5441 15.3632 26.0377 13.9761 25.0249 12.9339C24.0195 11.8918 22.7058 11.3707 21.0839 11.3707C19.8289 11.3707 18.7354 11.6863 17.8034 12.3175C16.8713 12.9413 16.2622 13.7706 15.9759 14.8054H15.7998C15.6237 13.7706 15.1063 12.9413 14.2476 12.3175C13.3889 11.6863 12.3651 11.3707 11.1762 11.3707C10.002 11.3707 8.9892 11.679 8.13787 12.2955C7.28655 12.9119 6.68475 13.7486 6.33248 14.8054H6.15634V11.5909H0.387873Z"
      fill="#238662"
    />
  </svg>
);

const LogoChristmas = (
  <svg
    width="40"
    height="39"
    viewBox="0 0 40 39"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1.85 1H19.7869C32.6764 1 40 7.64399 40 19.766C40 32.2 32.6764 39 19.7869 39H1.85C0.828298 39 0 38.172 0 37.15V2.85001C0 1.82801 0.828298 1 1.85 1ZM0.387901 11.591V28.5H6.4646V18.636C6.4646 18.145 6.5453 17.723 6.7068 17.37C6.8756 17.011 7.1104 16.736 7.4113 16.545C7.7122 16.354 8.0718 16.259 8.4901 16.259C9.1213 16.259 9.624 16.471 9.9983 16.897C10.3726 17.315 10.5597 17.895 10.5597 18.636V28.5H16.3722V18.636C16.3722 17.895 16.5521 17.315 16.9117 16.897C17.2786 16.471 17.774 16.259 18.3978 16.259C19.029 16.259 19.5317 16.471 19.906 16.897C20.2803 17.315 20.4674 17.895 20.4674 18.636V28.5H26.5441V17.095C26.5441 15.363 26.0377 13.976 25.0249 12.934C24.0195 11.892 22.7058 11.371 21.0839 11.371C19.8289 11.371 18.7354 11.686 17.8034 12.317C16.8713 12.941 16.2622 13.771 15.9759 14.805H15.7998C15.6237 13.771 15.1063 12.941 14.2476 12.317C13.3889 11.686 12.3651 11.371 11.1762 11.371C10.002 11.371 8.9892 11.679 8.1379 12.295C7.2865 12.912 6.6847 13.749 6.3325 14.805H6.1563V11.591H0.387901Z"
      fill="#238662"
    />
    <path
      d="M35.1089 4.9845L19.9845 0L15 15.1244L30.1244 20.1089L35.1089 4.9845Z"
      fill="url(#pattern0)"
    />
    <defs>
      <pattern
        id="pattern0"
        patternContentUnits="objectBoundingBox"
        width="1"
        height="1"
      >
        <use href="#image0_3_39" transform="scale(0.00195312)" />
      </pattern>
      <image
        id="image0_3_39"
        width="512"
        height="512"
        href="data:image/png;base64,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"
      />
    </defs>
  </svg>
);

type LogosMappings = {
  [key: string]: JSX.Element | undefined;
};

const map: LogosMappings = {
  default: LogoDefault,
  christmas: LogoChristmas,
};

const LogoIcon = (): JSX.Element => {
  return handling(map);
};

export default LogoIcon;
