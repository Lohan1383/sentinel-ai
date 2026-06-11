export interface PermissionPrompt {
  key: "location_foreground" | "location_background" | "notifications" | "motion_activity" | "camera";
  title: string;
  reason: string;
  required: boolean;
}

export class OnboardingService {
  getPermissions(): PermissionPrompt[] {
    return [
      {
        key: "location_foreground",
        title: "Foreground location",
        reason: "Needed to calculate nearby risks and show local load shedding/network status.",
        required: true
      },
      {
        key: "location_background",
        title: "Background location",
        reason: "Needed to warn before entering dangerous zones while the phone is locked.",
        required: true
      },
      {
        key: "notifications",
        title: "Notifications",
        reason: "Needed to deliver escalation alerts for safety, outages, and severe weather.",
        required: true
      },
      {
        key: "motion_activity",
        title: "Motion and activity",
        reason: "Optional optimization to improve route detection while reducing battery usage.",
        required: false
      },
      {
        key: "camera",
        title: "Camera",
        reason: "Used only when uploading incident evidence for authenticity checks.",
        required: false
      }
    ];
  }
}
