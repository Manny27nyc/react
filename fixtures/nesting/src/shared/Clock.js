// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
import React from 'react';

import useTime from './useTime';

export default function Clock() {
  const time = useTime();
  return <p>Time: {time}</p>;
}
