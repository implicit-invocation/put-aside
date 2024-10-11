export type WindowData = {
  id: number;
  tabs: string[];
  focusTab: number;
};

export type WorkspaceData = {
  windows: WindowData[];
  focusWindow: number;
};

export const getWorkspaceData = async () => {
  const currentWorkspaceData: WorkspaceData = {
    windows: [],
    focusWindow: 0,
  };
  const windows = await chrome.windows.getAll();
  for (let i = 0; i < windows.length; i++) {
    const window = windows[i];
    if (window.id === undefined) continue;
    if (window.focused) {
      currentWorkspaceData.focusWindow = i;
    }
    const windowData: WindowData = {
      id: window.id,
      tabs: [],
      focusTab: 0,
    };
    currentWorkspaceData.windows.push(windowData);
    const tabs = await chrome.tabs.query({
      windowId: window.id,
    });
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

export const openWorkspace = async (workspaceData: WorkspaceData) => {
  const currentWindows = await chrome.windows.getAll();
  for (const window of currentWindows) {
    if (window.id === undefined) continue;
    await chrome.windows.remove(window.id);
  }
  for (let i = 0; i < workspaceData.windows.length; i++) {
    const windowData = workspaceData.windows[i];
    const window = await chrome.windows.create({
      type: "normal",
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
    if (i === workspaceData.focusWindow && window.id !== undefined) {
      // TODO: not working
      await chrome.windows.update(window.id, {
        focused: true,
      });
    }
  }
};

export default {};
