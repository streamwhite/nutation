export type TextNodeRecord = {
  id: string;
  node: Text;
  original: string;
};

export class TextNodeRegistry {
  private readonly byId = new Map<string, TextNodeRecord>();
  private readonly byNode = new WeakMap<Text, string>();
  private nextId = 0;

  register(node: Text, original: string): string {
    const existingId = this.byNode.get(node);
    if (existingId) {
      return existingId;
    }

    const id = String(this.nextId);
    this.nextId += 1;
    const record: TextNodeRecord = { id, node, original };
    this.byId.set(id, record);
    this.byNode.set(node, id);
    return id;
  }

  get(id: string): TextNodeRecord | undefined {
    return this.byId.get(id);
  }

  hasNode(node: Text): boolean {
    return this.byNode.has(node);
  }

  applyTranslation(id: string, translation: string): boolean {
    const record = this.byId.get(id);
    if (!record || !record.node.isConnected) {
      return false;
    }
    record.node.textContent = translation;
    return true;
  }

  restoreAll(): number {
    let restored = 0;
    for (const record of this.byId.values()) {
      if (!record.node.isConnected) {
        continue;
      }
      record.node.textContent = record.original;
      restored += 1;
    }
    return restored;
  }

  translatedCount(): number {
    let count = 0;
    for (const record of this.byId.values()) {
      if (record.node.isConnected && record.node.textContent !== record.original) {
        count += 1;
      }
    }
    return count;
  }

  clear(): void {
    this.byId.clear();
    this.nextId = 0;
  }
}
