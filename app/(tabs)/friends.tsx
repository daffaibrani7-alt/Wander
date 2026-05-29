import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform } from "react-native";
import { GlassCard } from "@/shared/components/GlassCard";
import { COLORS } from "@/shared/theme/colors";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { MockService, FriendLocation } from "@/features/friends/services/mockService";

// Modularized Components
import { AddFriendSection } from "@/features/friends/components/AddFriendSection";
import { ActiveFriendsList } from "@/features/friends/components/ActiveFriendsList";

export default function FriendsScreen() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = COLORS.get(isDark);

  const [searchQuery, setSearchQuery] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [friendsList, setFriendsList] = useState<FriendLocation[]>([]);

  // Recommendations of people they might know to add (mocked)
  const [recommendations, setRecommendations] = useState([
    { uid: "rec-1", name: "Deni Pratama", mutual: 3, avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150", added: false },
    { uid: "rec-2", name: "Elisa Wulandari", mutual: 7, avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150", added: false },
    { uid: "rec-3", name: "Giri Wijaya", mutual: 1, avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150", added: false },
  ]);

  useEffect(() => {
    // Fetch initial simulated friends list
    setFriendsList(MockService.getFriends());
  }, []);

  const handleAddRecommendation = (rec: any) => {
    setRecommendations((prev) =>
      prev.map((item) => (item.uid === rec.uid ? { ...item, added: true } : item))
    );

    // Call mock service to add to simulator
    const newFriend = MockService.addMockFriend(rec.name);
    setFriendsList(prev => [...prev, newFriend]);

    setSuccessMessage(`Berhasil menambahkan ${rec.name} sebagai teman!`);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const handleCustomAdd = () => {
    if (!searchQuery.trim()) return;
    const name = searchQuery.trim();
    const newFriend = MockService.addMockFriend(name);
    setFriendsList(prev => [...prev, newFriend]);
    
    setSuccessMessage(`Berhasil menambahkan ${name} sebagai teman!`);
    setSearchQuery("");
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const filteredFriends = friendsList.filter((friend) =>
    friend.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Toast Notification */}
      {successMessage && (
        <GlassCard style={[styles.toast, { backgroundColor: COLORS.green }]}>
          <Text style={styles.toastText}>🎉 {successMessage}</Text>
        </GlassCard>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Radar Kehadiran Teman 👥</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Hubungkan langkah Anda dengan orang terdekat dan mulailah saling terhubung secara tenang.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search & Custom Invite */}
        <AddFriendSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          recommendations={recommendations}
          onAddRecommendation={handleAddRecommendation}
          onCustomAdd={handleCustomAdd}
        />

        {/* Existing Active Friends */}
        <ActiveFriendsList
          filteredFriends={filteredFriends}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toast: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 20,
    left: 20,
    right: 20,
    zIndex: 999,
    padding: 14,
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.2)",
  },
  toastText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 14,
    fontFamily: "System",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 20 : 32,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    fontFamily: "System",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
    fontWeight: "500",
    fontFamily: "System",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Leave space for floating tabs
  },
});
