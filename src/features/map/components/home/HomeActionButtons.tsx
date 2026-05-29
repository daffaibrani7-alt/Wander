import React from "react";
import { UtilitiesDock } from "./UtilitiesDock";

interface HomeActionButtonsProps {
  unreadCount: number;
  showNotifCenter: boolean;
  onNotifCenterPress: () => void;
  showSavedPlaces: boolean;
  onSavedPlacesPress: () => void;
  isExplorationActive: boolean;
  onExplorationPress: () => void;
  showUtilities: boolean;
  onUtilitiesPress: () => void;
  utilitiesAnim: any;
  isLockScreenSimulated: boolean;
  onLockScreenPress: () => void;
  isWidgetSimulatorActive: boolean;
  onWidgetSimulatorPress: () => void;
  isDashboardActive: boolean;
  onDashboardPress: () => void;
  overlayOpacity: any;
}

export function HomeActionButtons({
  unreadCount,
  showNotifCenter,
  onNotifCenterPress,
  showSavedPlaces,
  onSavedPlacesPress,
  isExplorationActive,
  onExplorationPress,
  showUtilities,
  onUtilitiesPress,
  utilitiesAnim,
  isLockScreenSimulated,
  onLockScreenPress,
  isWidgetSimulatorActive,
  onWidgetSimulatorPress,
  isDashboardActive,
  onDashboardPress,
  overlayOpacity,
}: HomeActionButtonsProps) {
  return (
    <UtilitiesDock
      unreadCount={unreadCount}
      showNotifCenter={showNotifCenter}
      onNotifCenterPress={onNotifCenterPress}
      showSavedPlaces={showSavedPlaces}
      onSavedPlacesPress={onSavedPlacesPress}
      isExplorationActive={isExplorationActive}
      onExplorationPress={onExplorationPress}
      isLockScreenSimulated={isLockScreenSimulated}
      onLockScreenPress={onLockScreenPress}
      isWidgetSimulatorActive={isWidgetSimulatorActive}
      onWidgetSimulatorPress={onWidgetSimulatorPress}
      isDashboardActive={isDashboardActive}
      onDashboardPress={onDashboardPress}
      overlayOpacity={overlayOpacity}
    />
  );
}
