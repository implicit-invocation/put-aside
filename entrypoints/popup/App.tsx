import { useState } from "react";
import { getWorkspaceData, openWorkspace, WindowData } from "../common";
import "./App.css";

const SwitchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M8 3 4 7l4 4" />
    <path d="M4 7h16" />
    <path d="m16 21 4-4-4-4" />
    <path d="M20 17H4" />
  </svg>
);

const FolderIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);

function App() {
  const [workspaces, setWorkspaces] = useState<
    { id: string; name: string; windows: number; tabs: number }[]
  >([]);
  const [addingWorkspace, setAddingWorkspace] = useState(false);
  const [titleText, setTitleText] = useState("");
  const [confirmingAction, setConfirmingAction] = useState<"switch" | "delete">(
    "switch"
  );
  const [confirmingId, setConfirmingId] = useState<string | undefined>();
  const [currentWorkspace, setCurrentWorkspace] = useState<
    string | undefined
  >();
  const reloadWorkspaces = useCallback(async () => {
    const data = await chrome.storage.sync.get(null);
    if (data.currentWorkspace) {
      setCurrentWorkspace(data.currentWorkspace);
    }
    const currentWorkspaces: {
      id: string;
      name: string;
      windows: number;
      tabs: number;
    }[] = [];
    for (const key of Object.keys(data)) {
      if (key.startsWith("workspaceData:")) {
        const id = key.replace("workspaceData:", "");
        const workspaceData = data[key];
        currentWorkspaces.push({
          id,
          name: workspaceData.name,
          windows: workspaceData.workspaceData.windows.length,
          tabs: workspaceData.workspaceData.windows.reduce(
            (acc: number, w: WindowData) => acc + w.tabs.length,
            0
          ),
        });
      }
    }
    setWorkspaces(currentWorkspaces);
  }, []);
  useEffect(() => {
    reloadWorkspaces();
    const cb = (msg: any) => {
      if (msg.type === "currentWorkspaceUpdated") {
        reloadWorkspaces();
      }
    };
    chrome.runtime.onMessage.addListener(cb);
    return () => {
      chrome.runtime.onMessage.removeListener(cb);
    };
  }, [reloadWorkspaces]);

  return (
    <div className="flex flex-col justify-start items-start w-full h-full pb-3 bg-gray-950 text-white gap-2">
      <form
        className="w-full flex flex-row gap-1 justify-start items-center p-3 pb-0"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!titleText) {
            return;
          }
          const id = `workspace-${Date.now()}`;
          const workspaceData = await getWorkspaceData();
          await chrome.storage.sync.set({
            [`workspaceData:${id}`]: {
              name: titleText,
              workspaceData,
            },
            currentWorkspace: id,
          });
          setTitleText("");
          setAddingWorkspace(false);
          reloadWorkspaces();
        }}
      >
        {!addingWorkspace && (
          <button
            role="button"
            type="button"
            className="w-full p-2 bg-gray-800 text-white rounded-lg"
            onClick={async () => {
              setAddingWorkspace(true);
            }}
          >
            + New workspace
          </button>
        )}
        {addingWorkspace && (
          <>
            <input
              type="text"
              placeholder="Workspace name"
              className="flex-1 p-2 bg-gray-700 text-white rounded-lg"
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
            />
            <button
              className="p-2 bg-gray-700 text-white rounded-lg"
              type="submit"
            >
              OK
            </button>
            <button
              type="button"
              className="p-2 bg-gray-700 text-white rounded-lg"
              onClick={() => {
                setAddingWorkspace(false);
                setTitleText("");
              }}
            >
              Cancel
            </button>
          </>
        )}
      </form>
      <div className="w-full flex flex-col gap-2 justify-start items-center">
        {workspaces.map((workspace) => (
          <div
            key={workspace.id}
            className={[
              "w-full flex flex-row gap-2 justify-start items-center px-3 py-2",
              currentWorkspace === workspace.id ? "bg-gray-700" : "",
            ].join(" ")}
          >
            <div className="flex-1 flex flex-col gap-1 justify-start items-start">
              <div className="flex flex-row gap-2 justify-start items-center">
                <FolderIcon />
                <div className="flex-1 line-clamp-1">
                  <span className="text-base">{workspace.name}</span>
                </div>
              </div>
              <div className="text-xs">
                {workspace.windows} windows - {workspace.tabs} tabs
              </div>
            </div>
            {confirmingId !== workspace.id ? (
              <div className="flex gap-1">
                <button
                  className="p-2 bg-gray-800 text-white rounded-lg disabled:opacity-20"
                  disabled={currentWorkspace === workspace.id}
                  onClick={async () => {
                    if (currentWorkspace === workspace.id) {
                      return;
                    }
                    setConfirmingId(workspace.id);
                    setConfirmingAction("switch");
                  }}
                >
                  <SwitchIcon />
                </button>
                <button
                  className="p-2 bg-gray-800 text-white rounded-lg"
                  onClick={async () => {
                    setConfirmingAction("delete");
                    setConfirmingId(workspace.id);
                  }}
                >
                  <TrashIcon />
                </button>
              </div>
            ) : (
              <div className="flex gap-1 justify-center items-center">
                <div className="text-xs font-bold">
                  {confirmingAction === "switch" ? "Switch" : "Delete"}?
                </div>
                <button
                  className="p-2 bg-gray-800 text-white rounded-lg"
                  onClick={async () => {
                    if (confirmingAction === "delete") {
                      await chrome.storage.sync.remove(
                        `workspaceData:${confirmingId}`
                      );
                      if (currentWorkspace === confirmingId) {
                        await chrome.storage.sync.remove("currentWorkspace");
                      }
                      setConfirmingId(undefined);
                      reloadWorkspaces();
                    } else {
                      if (currentWorkspace === confirmingId) {
                        return;
                      }
                      await chrome.storage.sync.set({
                        currentWorkspace: confirmingId,
                      });
                      const result = await chrome.storage.sync.get(
                        `workspaceData:${confirmingId}`
                      );
                      if (result[`workspaceData:${confirmingId}`]) {
                        const workspaceData =
                          result[`workspaceData:${confirmingId}`];
                        await openWorkspace(workspaceData.workspaceData);
                        const updatedWorkspaceData = await getWorkspaceData();
                        await chrome.storage.sync.set({
                          [`workspaceData:${confirmingId}`]: {
                            name: workspaceData.name,
                            workspaceData: updatedWorkspaceData,
                          },
                        });
                      }
                      setConfirmingId(undefined);
                      reloadWorkspaces();
                    }
                  }}
                >
                  Ok
                </button>
                <button
                  className="p-2 bg-gray-800 text-white rounded-lg"
                  onClick={() => {
                    setConfirmingId(undefined);
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
