import { getWorkspaceData } from "./common";

function debounce(fn: () => void, ms: number) {
  let timeout: NodeJS.Timeout | undefined;
  return () => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(fn, ms);
  };
}

export default defineBackground(() => {
  const storeCurrentWorkspace = debounce(async () => {
    const { currentWorkspace } = await chrome.storage.sync.get(
      "currentWorkspace"
    );
    if (!currentWorkspace) {
      return;
    }
    const dataKey = `workspaceData:${currentWorkspace}`;
    const storedWorkspace = await chrome.storage.sync.get(dataKey);
    if (!storedWorkspace[dataKey]) {
      return;
    }
    const name = storedWorkspace[dataKey].name;
    const currentWorkspaceData = await getWorkspaceData();
    await chrome.storage.sync.set({
      [`workspaceData:${currentWorkspace}`]: {
        name,
        workspaceData: currentWorkspaceData,
      },
    });
    // await chrome.runtime.sendMessage({
    //   type: "currentWorkspaceUpdated",
    // });
  }, 200);
  chrome.tabs.onCreated.addListener(() => {
    storeCurrentWorkspace();
  });
  chrome.tabs.onRemoved.addListener(() => {
    storeCurrentWorkspace();
  });
  chrome.windows.onRemoved.addListener(() => {
    storeCurrentWorkspace();
  });
  chrome.windows.onCreated.addListener(() => {
    storeCurrentWorkspace();
  });
  chrome.tabs.onUpdated.addListener(() => {
    storeCurrentWorkspace();
  });
  chrome.tabs.onReplaced.addListener(() => {
    storeCurrentWorkspace();
  });
  chrome.windows.onFocusChanged.addListener(() => {
    storeCurrentWorkspace();
  });
  chrome.tabs.onActivated.addListener(() => {
    storeCurrentWorkspace();
  });
});
