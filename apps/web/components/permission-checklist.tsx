import styles from "./sentinel-app.module.css";

interface PermissionInfo {
  key: string;
  title: string;
  reason: string;
  required: boolean;
}

interface PermissionChecklistProps {
  items: PermissionInfo[];
  granted: Record<string, boolean>;
  onRequest: (key: string) => void;
}

export function PermissionChecklist({ items, granted, onRequest }: PermissionChecklistProps) {
  return (
    <div className={styles.permissionList}>
      {items.map((item) => {
        const isGranted = Boolean(granted[item.key]);
        return (
          <div className={styles.permissionItem} key={item.key}>
            <div>
              <p className={styles.feedTitle}>{item.title}</p>
              <p className={styles.feedSummary}>{item.reason}</p>
              <p className={styles.small}>{item.required ? "Required" : "Optional"}</p>
            </div>
            <button
              type="button"
              className={styles.permissionButton}
              disabled={isGranted}
              onClick={() => {
                onRequest(item.key);
              }}
            >
              {isGranted ? "Granted" : "Enable"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
