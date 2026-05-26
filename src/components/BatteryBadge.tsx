import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Battery, Zap } from "lucide-react-native";

interface BatteryBadgeProps {
  level: number;
  isCharging: boolean;
  size?: "sm" | "md";
}

export function BatteryBadge({ level, isCharging, size = "md" }: BatteryBadgeProps) {
  // Determine color based on battery level
  const getBatteryColor = () => {
    if (isCharging) return "#FFF500"; // Neon yellow charging
    if (level > 50) return "#2BE080";  // Neon green
    if (level > 20) return "#FF8A00";  // Orange
    return "#FF5B99";                  // Zenly pink/red
  };

  const color = getBatteryColor();
  const isSm = size === "sm";

  return (
    <View 
      style={[
        styles.container, 
        { borderColor: "rgba(255,255,255,0.08)" },
        isSm ? styles.smContainer : styles.mdContainer
      ]}
    >
      <View style={[styles.pill, { backgroundColor: color + "20" }]}>
        {isCharging ? (
          <Zap size={isSm ? 10 : 13} color={color} fill={color} style={styles.icon} />
        ) : (
          <Battery size={isSm ? 11 : 14} color={color} style={styles.icon} />
        )}
        <Text style={[styles.text, { color: color, fontSize: isSm ? 9 : 11 }]}>
          {level}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 99,
    borderWidth: 1,
    overflow: "hidden",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  smContainer: {
    paddingVertical: 1,
    paddingHorizontal: 5,
  },
  mdContainer: {
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  icon: {
    marginRight: 3,
  },
  text: {
    fontWeight: "800",
    fontFamily: "System",
  },
});
export default BatteryBadge;
