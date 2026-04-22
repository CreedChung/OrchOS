import { create } from "zustand";
import { api, type Conversation, type ConversationMessage } from "@/lib/api";

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messagesByConversationId: Record<string, ConversationMessage[]>;
  hasLoadedConversations: boolean;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
}

interface ConversationActions {
  loadConversations: () => Promise<void>;
  setActiveConversationId: (id: string | null) => void;
  loadMessages: (conversationId: string) => Promise<void>;
  createConversation: (data: { runtimeId?: string }) => Promise<Conversation>;
  updateConversation: (
    id: string,
    data: {
      title?: string;
      projectId?: string;
      agentId?: string;
      runtimeId?: string;
      archived?: boolean;
      deleted?: boolean;
    }
  ) => Promise<void>;
  deleteConversation: (id: string, permanent?: boolean) => Promise<void>;
  addMessage: (conversationId: string, message: ConversationMessage) => void;
  getActiveConversation: () => Conversation | null;
  getActiveMessages: () => ConversationMessage[];
}

export const useConversationStore = create<ConversationState & ConversationActions>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messagesByConversationId: {},
  hasLoadedConversations: false,
  isLoadingConversations: false,
  isLoadingMessages: false,

  loadConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const list = await api.listConversations();
      set({ conversations: list, hasLoadedConversations: true });
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  setActiveConversationId: (id) => {
    set({ activeConversationId: id });
  },

  loadMessages: async (conversationId) => {
    set({ isLoadingMessages: true });
    try {
      const msgs = await api.getConversationMessages(conversationId);
      set((state) => ({
        messagesByConversationId: {
          ...state.messagesByConversationId,
          [conversationId]: msgs,
        },
      }));
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  createConversation: async (data) => {
    const conv = await api.createConversation(data);
    const list = await api.listConversations();
    set({ conversations: list, activeConversationId: conv.id });
    return conv;
  },

  updateConversation: async (id, data) => {
    await api.updateConversation(id, data);
    const list = await api.listConversations();
    set({ conversations: list });
  },

  deleteConversation: async (id, permanent = false) => {
    await api.deleteConversation(id, permanent ? { permanent: true } : undefined);
    const list = await api.listConversations();
    const { activeConversationId } = get();
    set({
      conversations: list,
      activeConversationId: activeConversationId === id ? null : activeConversationId,
    });
  },

  addMessage: (conversationId, message) => {
    set((state) => ({
      messagesByConversationId: {
        ...state.messagesByConversationId,
        [conversationId]: [...(state.messagesByConversationId[conversationId] || []), message],
      },
    }));
  },

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get();
    return conversations.find((c) => c.id === activeConversationId) ?? null;
  },

  getActiveMessages: () => {
    const { messagesByConversationId, activeConversationId } = get();
    if (!activeConversationId) return [];
    return messagesByConversationId[activeConversationId] || [];
  },
}));
