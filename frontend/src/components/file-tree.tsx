'use client';
import { useState } from 'react';
import { ChevronRight, ChevronDown, FileCode2, Folder, FolderOpen } from 'lucide-react';
import { CodeFile } from '@/lib/types';
type Tree = { folders: Record<string, Tree>; files: CodeFile[] };
export function FileTree({
  files,
  selected,
  active,
  toggle,
  preview,
}: {
  files: CodeFile[];
  selected: string[];
  active?: string;
  toggle: (id: string) => void;
  preview: (file: CodeFile) => void;
}) {
  const root: Tree = { folders: {}, files: [] };
  files.forEach((file) => {
    const parts = file.path.split('/');
    let node = root;
    parts.slice(0, -1).forEach((p) => {
      node.folders[p] ||= { folders: {}, files: [] };
      node = node.folders[p];
    });
    node.files.push(file);
  });
  return (
    <div className="file-tree">
      <TreeNode tree={root} selected={selected} active={active} toggle={toggle} preview={preview} />
    </div>
  );
}
function TreeNode({
  tree,
  selected,
  active,
  toggle,
  preview,
}: {
  tree: Tree;
  selected: string[];
  active?: string;
  toggle: (id: string) => void;
  preview: (file: CodeFile) => void;
}) {
  return (
    <>
      {Object.entries(tree.folders)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, node]) => (
          <FolderNode key={name} name={name}>
            <TreeNode
              tree={node}
              selected={selected}
              active={active}
              toggle={toggle}
              preview={preview}
            />
          </FolderNode>
        ))}
      {tree.files.map((file) => (
        <div className={`tree-file ${file.id === active ? 'active' : ''}`} key={file.id}>
          <input
            type="checkbox"
            aria-label={`Select ${file.path}`}
            checked={selected.includes(file.id)}
            onChange={() => toggle(file.id)}
          />
          <button onClick={() => preview(file)} title={file.path}>
            <FileCode2 size={15} />
            <span>{file.path.split('/').pop()}</span>
          </button>
        </div>
      ))}
    </>
  );
}
function FolderNode({ name, children }: { name: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="tree-folder">
      <button className="tree-folder-button" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}{' '}
        {open ? <FolderOpen size={15} /> : <Folder size={15} />}
        <span>{name}</span>
      </button>
      {open && <div className="tree-children">{children}</div>}
    </div>
  );
}
