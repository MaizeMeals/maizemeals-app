import React from 'react';

const Food24FilledIcon = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 0,
  background = 'transparent',
  opacity = 1,
  rotation = 0,
  shadow = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0
}) => {
  const transforms = [];
  if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);
  if (flipHorizontal) transforms.push('scaleX(-1)');
  if (flipVertical) transforms.push('scaleY(-1)');

  const viewBoxSize = 24 + (padding * 2);
  const viewBoxOffset = -padding;
  const viewBox = `${viewBoxOffset} ${viewBoxOffset} ${viewBoxSize} ${viewBoxSize}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        opacity,
        transform: transforms.join(' ') || undefined,
        filter: shadow > 0 ? `drop-shadow(0 ${shadow}px ${shadow * 2}px rgba(0,0,0,0.3))` : undefined,
        backgroundColor: background !== 'transparent' ? background : undefined
      }}
    >
      <path fill={color} d="M3.743 2.816A.88.88 0 0 1 5.5 2.88v4.494a.625.625 0 1 0 1.25 0V2.75a.75.75 0 0 1 1.5 0v4.624a.625.625 0 1 0 1.25 0V2.88a.88.88 0 0 1 1.757-.064C11.3 3.428 11.5 6.37 11.5 8c0 1.35-.67 2.544-1.692 3.267c-.216.153-.268.315-.263.397c.123 1.878.455 7.018.455 7.833a2.5 2.5 0 0 1-5 0c0-.816.332-5.955.455-7.833c.005-.082-.047-.244-.263-.397A4 4 0 0 1 3.5 8c0-1.63.2-4.572.243-5.184M13 7.75A5.75 5.75 0 0 1 18.75 2a.75.75 0 0 1 .75.75v8.5c0 .318.106 1.895.225 3.642l.005.083c.13 1.908.27 3.983.27 4.522a2.5 2.5 0 0 1-5 0c0-.514.128-2.611.252-4.534c.062-.971.125-1.912.172-2.61l.023-.353h-.697A1.75 1.75 0 0 1 13 10.25z"/>
    </svg>
  );
};

export default Food24FilledIcon;
