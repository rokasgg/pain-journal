// Bottom tab bar height, used by (tabs)/_layout.tsx's tabBarStyle. Kept as a
// shared constant so anything that needs to position against the tab bar
// (it lives outside each screen's own view tree, so it can't be measured by
// ref) reads the same value instead of a duplicated literal.
export const TAB_BAR_HEIGHT = 80;
