import { arrayMoveImmutable, arrayMoveMutable } from "array-move";
import { useState } from "react";
import SortableList, { SortableItem } from "react-easy-sort";
import {
  getData,
  getWorkspaceData,
  openWorkspace,
  saveWorkspaceData,
  updateWorkspaceIndices,
  WindowData,
} from "../common";
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

const GripIcon = () => (
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
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="19" r="1" />
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
  const [emptyWorkspace, setEmptyWorkspace] = useState(false);
  const [titleText, setTitleText] = useState("");
  const [confirmingAction, setConfirmingAction] = useState<"switch" | "delete">(
    "switch"
  );
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [confirmingId, setConfirmingId] = useState<string | undefined>();
  const [currentWorkspace, setCurrentWorkspace] = useState<
    string | undefined
  >();
  const reloadWorkspaces = useCallback(async () => {
    const data = await chrome.storage.local.get(null);
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
    const indices = await getData("workspaceIndices");
    setWorkspaces(
      currentWorkspaces.sort((a, b) => indices[a.id] - indices[b.id])
    );
  }, []);

  const switchWorkspace = useCallback(async (confirmingId: string) => {
    await chrome.storage.local.set({
      currentWorkspace: confirmingId,
    });
    const workspaceData = await getData(`workspaceData:${confirmingId}`);
    if (workspaceData) {
      await openWorkspace(workspaceData.workspaceData);
      const updatedWorkspaceData = await getWorkspaceData();
      await saveWorkspaceData(confirmingId, updatedWorkspaceData);
    }
    setConfirmingId(undefined);
    reloadWorkspaces();
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "c" || e.key === "e") {
        if (addingWorkspace) return;
        e.preventDefault();
        setAddingWorkspace(true);
        setConfirmingId(undefined);
        setTitleText("");
        setEmptyWorkspace(e.key === "e");
        titleInputRef.current?.focus();
      } else if (e.key === "1" || e.key === "2" || e.key === "3") {
        if (addingWorkspace) return;
        e.preventDefault();
        setConfirmingAction("switch");
        const index = e.key === "1" ? 0 : e.key === "2" ? 1 : 2;
        if (currentWorkspace === workspaces[index]?.id) {
          return;
        }
        setConfirmingId(workspaces[index]?.id);
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (addingWorkspace) {
          setAddingWorkspace(false);
          setTitleText("");
        } else if (confirmingId) {
          setConfirmingId(undefined);
        }
      } else if (e.key === "Enter") {
        if (addingWorkspace) {
          return;
        }
        if (confirmingId && confirmingAction === "switch") {
          e.preventDefault();
          switchWorkspace(confirmingId);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    workspaces,
    addingWorkspace,
    confirmingId,
    confirmingAction,
    currentWorkspace,
  ]);

  return (
    <div className="flex flex-col justify-start items-start w-full h-full pb-3 bg-gray-950 text-white gap-2">
      <div className="p-3 pb-0 flex flex-row gap-2 justify-start items-center w-full">
        <img src="./icon/128.png" alt="put aside logo" className="w-12 h-12" />
        <div className="text-xl font-semibold">put-aside</div>
      </div>
      <form
        className="w-full flex flex-row gap-1 justify-start items-center p-3 pb-0 pt-0"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!titleText) {
            return;
          }
          const id = `workspace-${Date.now()}`;
          if (emptyWorkspace) {
            const windows = await chrome.windows.getAll();
            await chrome.storage.local.set({
              [`workspaceData:${id}`]: {
                name: titleText,
                workspaceData: {
                  windows: [
                    {
                      id: 0,
                      tabs: [],
                      focusTab: 0,
                    },
                  ],
                  focusWindow: 0,
                },
                index: workspaces.length,
              },
              currentWorkspace: id,
            });
            await updateWorkspaceIndices([...workspaces.map((w) => w.id), id]);
            for (let i = 0; i < windows.length; i++) {
              const window = windows[i];
              if (window.id === undefined) continue;
              await chrome.windows.remove(window.id);
            }
            await chrome.windows.create({
              type: "normal",
            });
            return;
          }
          const workspaceData = await getWorkspaceData();
          await chrome.storage.local.set({
            [`workspaceData:${id}`]: {
              name: titleText,
              workspaceData,
              index: workspaces.length,
            },
            currentWorkspace: id,
          });
          setTitleText("");
          setAddingWorkspace(false);
          reloadWorkspaces();
        }}
      >
        {!addingWorkspace && (
          <div className="flex flex-col gap-2 justify-start items-center w-full">
            <button
              role="button"
              type="button"
              className="w-full p-2 bg-gray-800 text-white rounded-lg"
              onClick={async () => {
                setAddingWorkspace(true);
                setEmptyWorkspace(false);
              }}
            >
              + Workspace with current tabs (C)
            </button>
            <button
              role="button"
              type="button"
              className="w-full p-2 bg-gray-800 text-white rounded-lg"
              onClick={async () => {
                setAddingWorkspace(true);
                setEmptyWorkspace(true);
              }}
            >
              + Empty workspace (E)
            </button>
          </div>
        )}
        {addingWorkspace && (
          <>
            <input
              autoFocus
              ref={titleInputRef}
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
      <SortableList
        onSortEnd={async (oldIndex, newIndex) => {
          if (oldIndex === newIndex) return;
          const ids = workspaces.map((w) => w.id);
          arrayMoveMutable(ids, oldIndex, newIndex);
          setWorkspaces(arrayMoveImmutable(workspaces, oldIndex, newIndex));
          await updateWorkspaceIndices(ids);
          reloadWorkspaces();
        }}
        className="w-full flex flex-col gap-2 justify-start items-center"
        draggedItemClassName="text-white"
      >
        {workspaces.length === 0 && (
          <div className="flex flex-col gap-2 justify-start items-center">
            <div className="text-center text-xs italic">
              You don't have any workspaces yet.
            </div>
          </div>
        )}
        {workspaces.map((workspace, i) => (
          <SortableItem key={workspace.id}>
            <div
              className={[
                "w-full flex flex-row gap-2 justify-start items-center px-3 py-2",
                confirmingId === undefined && currentWorkspace === workspace.id
                  ? "bg-gray-700"
                  : "",
                confirmingId === workspace.id
                  ? "bg-gray-700 border-2 border-orange-600"
                  : "",
              ].join(" ")}
            >
              <div className="flex-1 flex flex-col gap-1 justify-start items-start">
                <div className="flex flex-row gap-2 justify-start items-center">
                  <div className="cursor-move">
                    <GripIcon />
                  </div>
                  <div
                    className={[
                      "w-6 h-6 flex justify-center items-center",
                      i < 3 ? "border bg-gray-600 rounded-lg" : "",
                    ].join(" ")}
                  >
                    {i < 3 && <div>{i + 1}</div>}
                    {i >= 3 && <FolderIcon />}
                  </div>
                  <div className="flex-1 line-clamp-1">
                    <span className="text-base">{workspace.name}</span>
                  </div>
                </div>
                <div className="text-xs line-clamp-1">
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
                        await chrome.storage.local.remove(
                          `workspaceData:${confirmingId}`
                        );
                        await updateWorkspaceIndices(
                          workspaces
                            .filter((w) => w.id !== confirmingId)
                            .map((w) => w.id)
                        );
                        if (currentWorkspace === confirmingId) {
                          await chrome.storage.local.remove("currentWorkspace");
                        }
                        setConfirmingId(undefined);
                        reloadWorkspaces();
                      } else {
                        switchWorkspace(confirmingId);
                      }
                    }}
                  >
                    Ok ⏎
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
          </SortableItem>
        ))}
      </SortableList>
    </div>
  );
}

export default App;
