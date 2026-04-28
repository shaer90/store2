// NOIR — icon set (line, 24x24)
const Icon = ({ name, size = 20, ...rest }) => {
  const paths = {
    home: <><path d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2v-9z"/></>,
    shop: <><path d="M5 7h14l-1 13H6L5 7z"/><path d="M9 7a3 3 0 016 0"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
    bag: <><path d="M5 8h14l-1.5 12h-11L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></>,
    heart: <><path d="M12 21s-7-4.5-9.5-9A5 5 0 0112 6a5 5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z"/></>,
    heartFill: <><path d="M12 21s-7-4.5-9.5-9A5 5 0 0112 6a5 5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z" fill="currentColor"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    minus: <><path d="M5 12h14"/></>,
    close: <><path d="M6 6l12 12M18 6L6 18"/></>,
    arrow: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
    arrowL: <><path d="M19 12H5M11 5l-7 7 7 7"/></>,
    chev: <><path d="M9 6l6 6-6 6"/></>,
    chevL: <><path d="M15 6l-6 6 6 6"/></>,
    chevD: <><path d="M6 9l6 6 6-6"/></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4"/></>,
    sort: <><path d="M3 6h13M3 12h9M3 18h5"/><path d="M17 14l3 3 3-3"/><path d="M20 7v10"/></>,
    star: <><path d="M12 3l2.6 5.5 6 .8-4.3 4.2 1 6L12 16.7 6.7 19.5l1-6L3.4 9.3l6-.8L12 3z"/></>,
    truck: <><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></>,
    shield: <><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z"/></>,
    refresh: <><path d="M4 4v6h6"/><path d="M20 12a8 8 0 11-2.3-5.7L20 4"/></>,
    bell: <><path d="M6 16V11a6 6 0 0112 0v5l1.5 2H4.5L6 16z"/><path d="M10 20a2 2 0 004 0"/></>,
    map: <><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z"/><path d="M9 4v14M15 6v14"/></>,
    card: <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/></>,
    box: <><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></>,
    apple: <><path d="M16 14c0-3 2-4 2-4-1-2-3-2-4-2-2 0-3 1-4 1s-2-1-4-1c-2 0-4 2-4 5 0 4 3 9 5 9 1 0 2-1 3-1s2 1 3 1 2-2 3-3"/><path d="M12 5c1-2 3-2 3-2s0 2-1 3-3 0-2-1z"/></>,
    google: <><path d="M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9c2 0 4 1 5 2l-2 2c-1-1-2-1-3-1-3 0-6 3-6 6s3 6 6 6c2 0 5-1 5-4h-5v-3h8c0 1 1 1 1 1z"/></>,
    spark: <><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/></>,
    check: <><path d="M5 12l5 5 9-12"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></>,
    edit: <><path d="M4 20h4l11-11-4-4L4 16v4z"/></>,
    download: <><path d="M12 4v12M6 11l6 6 6-6"/><path d="M4 20h16"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths[name] || null}
    </svg>
  );
};

window.Icon = Icon;
