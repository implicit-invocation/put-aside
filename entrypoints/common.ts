export type WindowData = {
  id: number;
  tabs: string[];
  focusTab: number;
};

export type WorkspaceData = {
  windows: WindowData[];
  focusWindow: number;
  icons?: (string | undefined)[];
};

export const getWorkspaceData = async () => {
  const lastFocusedWindow = await chrome.windows.getLastFocused({
    windowTypes: ["normal"],
  });
  const currentWorkspaceData: WorkspaceData = {
    windows: [],
    focusWindow: 0,
    icons: [],
  };
  const windows = await chrome.windows.getAll();
  for (let i = 0; i < windows.length; i++) {
    const window = windows[i];
    if (window.id === undefined) continue;
    const tabs = await chrome.tabs.query({
      windowId: window.id,
    });
    if (window.id === lastFocusedWindow.id) {
      currentWorkspaceData.focusWindow = i;
      currentWorkspaceData.icons?.push(
        ...tabs.slice(0, 10).map((t) => t.favIconUrl)
      );
    }
    const windowData: WindowData = {
      id: window.id,
      tabs: [],
      focusTab: 0,
    };
    currentWorkspaceData.windows.push(windowData);
    for (let j = 0; j < tabs.length; j++) {
      const tab = tabs[j];
      if (tab.url === undefined) continue;
      windowData.tabs.push(tab.url);
      if (tab.active) {
        windowData.focusTab = j;
      }
    }
  }
  return currentWorkspaceData;
};

export const getData = async (key: string) => {
  const data = await chrome.storage.local.get(key);
  return data[key];
};

const openWindow = async (windowData: WindowData) => {
  const window = await chrome.windows.create({
    type: "normal",
    focused: true,
    state: "maximized",
    url: windowData.tabs,
  });
  const createdTabs = await chrome.tabs.query({ windowId: window.id });
  for (let j = 0; j < createdTabs.length; j++) {
    const tab = createdTabs[j];
    if (tab.url === undefined) continue;
    if (windowData.focusTab === j && tab.id !== undefined) {
      await chrome.tabs.update(tab.id, {
        active: true,
      });
    }
  }
  return window;
};

export const openWorkspace = async (workspaceData: WorkspaceData) => {
  const currentWindows = await chrome.windows.getAll();
  for (let i = 0; i < workspaceData.windows.length; i++) {
    const windowData = workspaceData.windows[i];
    if (i === workspaceData.focusWindow) {
      continue;
    }
    await openWindow(windowData);
  }
  for (let i = 0; i < workspaceData.windows.length; i++) {
    if (i !== workspaceData.focusWindow) {
      continue;
    }
    const windowData = workspaceData.windows[i];
    const window = await openWindow(windowData);
    if (window.id === undefined) continue;
    await chrome.windows.update(window.id, {
      focused: true,
    });
  }
  for (const window of currentWindows) {
    if (window.id === undefined) continue;
    await chrome.windows.remove(window.id);
  }
};

export const saveWorkspaceData = async (
  id: string,
  workspaceData: WorkspaceData
) => {
  const data = await getData(`workspaceData:${id}`);
  if (data) {
    await chrome.storage.local.set({
      [`workspaceData:${id}`]: {
        ...data,
        workspaceData,
      },
    });
  }
};

export const updateWorkspaceIndices = async (ids: string[]) => {
  const indices: { [id: string]: number } = {};
  for (let i = 0; i < ids.length; i++) {
    indices[ids[i]] = i;
  }
  await chrome.storage.local.set({
    workspaceIndices: indices,
  });
};

export default {};
