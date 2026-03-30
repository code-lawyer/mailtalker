import React, { useState, useCallback, useEffect, Component } from 'react';
import ContactList from './components/ContactList';
import ChatWindow from './components/ChatWindow';
import SettingsModal from './components/SettingsModal';
import AddContactModal from './components/AddContactModal';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('UI crash:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center h-screen w-screen bg-[var(--color-base)] text-[var(--color-text-primary)]">
                    <div className="text-center p-8 max-w-md">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[rgba(196,91,74,0.15)] border border-[rgba(196,91,74,0.3)] flex items-center justify-center">
                            <span className="text-[var(--color-danger)] text-xl">!</span>
                        </div>
                        <h2 className="text-lg font-semibold mb-2">界面发生错误</h2>
                        <p className="font-mono text-sm text-[var(--color-text-secondary)] mb-4">
                            {this.state.error?.message || '未知错误'}
                        </p>
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="px-5 py-2 bg-[var(--color-accent)] text-[var(--color-base)] rounded-lg text-sm font-medium hover:brightness-[1.1] transition-all"
                        >
                            重新加载
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function App() {
    const [selectedContact, setSelectedContact] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showAddContact, setShowAddContact] = useState(false);
    const [contactsVersion, setContactsVersion] = useState(0);

    const refreshContacts = useCallback(() => {
        setContactsVersion(v => v + 1);
    }, []);

    // Auto-open settings on first launch
    useEffect(() => {
        window.electronAPI.getSettings().then(data => {
            if (!data) setShowSettings(true);
        });
    }, []);

    return (
        <ErrorBoundary>
            <div className="flex overflow-hidden font-sans h-screen w-screen bg-[var(--color-base)] text-[var(--color-text-primary)] selection:bg-[var(--color-accent-muted)] selection:text-[var(--color-accent)]">
                {/* Sidebar */}
                <ContactList
                    selectedContactId={selectedContact?.id}
                    onSelectContact={setSelectedContact}
                    onOpenSettings={() => setShowSettings(true)}
                    onOpenAddContact={() => setShowAddContact(true)}
                    refreshKey={contactsVersion}
                />

                {/* Main Chat Area */}
                <ChatWindow contact={selectedContact} />

                {/* Modals */}
                {showSettings && (
                    <SettingsModal onClose={() => setShowSettings(false)} />
                )}

                {showAddContact && (
                    <AddContactModal
                        onClose={() => setShowAddContact(false)}
                        onAdded={refreshContacts}
                    />
                )}
            </div>
        </ErrorBoundary>
    );
}
