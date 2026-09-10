// =============================================================================
// FILE: app_strings.dart
// PURPOSE: All user-facing string literals in one place.
//          Eliminates magic strings; simplifies future localisation.
//
// NASA RULE 3 — compile-time const.
// =============================================================================

abstract final class AppStrings {
  // App
  static const String appName     = 'RouteIQ';
  static const String appTagline  = 'Built for truckers, by truckers.';

  // Auth
  static const String enterPhone      = 'Enter your phone number';
  static const String phoneHint       = '(555) 000-0000';
  static const String sendCode        = 'Send Code';
  static const String orContinueEmail = 'OR';
  static const String continueEmail   = 'Continue with Email';
  static const String verifyTitle     = 'Check your messages';
  static const String verifyCode      = 'Verify Code';
  static const String resendCode      = 'Resend Code';

  // Navigation tabs
  static const String tabHome     = 'Home';
  static const String tabLoads    = 'Loads';
  static const String tabDocs     = 'Docs';
  static const String tabMessages = 'Msgs';
  static const String tabProfile  = 'Profile';

  // Home
  static const String goodMorning = 'Good morning';
  static const String activeLoad  = 'Active Load';
  static const String nextStop    = 'NEXT STOP';
  static const String navigate    = 'Navigate';
  static const String checkCall   = 'Check Call';
  static const String delay       = 'Delay';
  static const String todayMiles  = 'Today Miles';
  static const String driveTime   = 'Drive Time';
  static const String stopsDone   = 'Stops Done';
  static const String messages    = 'Messages';

  // Loads
  static const String loadsTitle      = 'Loads';
  static const String tabActive       = 'Active';
  static const String tabUpcoming     = 'Upcoming';
  static const String tabHistory      = 'History';
  static const String arriveNextStop  = 'Arrive at Next Stop';
  static const String viewOnMap       = 'View on Map';
  static const String confirmArrival  = 'Confirm Arrival';
  static const String confirmDeparture= 'Confirm Departure';
  static const String completeDelivery= 'Complete Delivery';

  // Delivery
  static const String podPhoto        = 'Proof of Delivery Photo';
  static const String tapCapture      = 'Tap to capture POD photo';
  static const String consigneeSign   = 'Consignee Signature';
  static const String signAboveLine   = 'Sign above the line';
  static const String clearSignature  = 'Clear';

  // Profile
  static const String profileTitle    = 'Profile';
  static const String hosTitle        = 'Hours of Service';
  static const String settingsTitle   = 'Settings';
  static const String settlements     = 'Settlements';
  static const String myDocuments     = 'My Documents';
  static const String performance     = 'Performance';
  static const String expenses        = 'Expenses';

  // HOS statuses
  static const String offDuty    = 'OFF DUTY';
  static const String sleeper    = 'SLEEPER';
  static const String driving    = 'DRIVING';
  static const String onDuty     = 'ON DUTY';

  // Load statuses
  static const String statusInTransit  = 'IN TRANSIT';
  static const String statusDelivered  = 'DELIVERED';
  static const String statusAssigned   = 'ASSIGNED';
  static const String statusDispatched = 'DISPATCHED';
  static const String statusConfirmed  = 'CONFIRMED';
  static const String statusDraft      = 'DRAFT';

  // Stop types
  static const String pickup   = 'PICKUP';
  static const String delivery = 'DELIVERY';
  static const String waypoint = 'WAYPOINT';

  // Error / empty states
  static const String noActiveLoad = 'No active load assigned';
  static const String contactDispatch = 'Contact your dispatcher for load assignment.';
  static const String noMessages  = 'No messages yet';
}
