/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Space, JobProfile, BatchJob, BatchResult, HFAccount, AppSettings } from './types';
import { LocalRoomDatabase } from './utils/storage';
import { BatchQueueEngine } from './utils/queueEngine';
import { TopAppBar, NavigationRail, MobileBottomBar, NavScreen } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { SpacesView } from './components/SpacesView';
import { ProfilesView } from './components/ProfilesView';
import { QueueView } from './components/QueueView';
import { ResultsView } from './components/ResultsView';
import { AccountsView } from './components/AccountsView';
import { SettingsView } from './components/SettingsView';
import { BatchCreationDialog } from './components/BatchCreationDialog';
import { MediaPreviewModal } from './components/MediaPreviewModal';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<NavScreen>('dashboard');
  const [isAndroidFrame, setIsAndroidFrame] = useState<boolean>(false);

  // Core Data States mirroring Room Database
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [profiles, setProfiles] = useState<JobProfile[]>([]);
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [accounts, setAccounts] = useState<HFAccount[]>([]);
  const [settings, setSettings] = useState<AppSettings>(LocalRoomDatabase.getSettings());

  // Dialog & Modal States
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState<boolean>(false);
  const [previewResult, setPreviewResult] = useState<BatchResult | null>(null);

  // Queue State
  const [queueRunning, setQueueRunning] = useState<boolean>(false);
  const [queuePaused, setQueuePaused] = useState<boolean>(false);

  // Initial Load & Queue Engine subscription
  useEffect(() => {
    setSpaces(LocalRoomDatabase.getSpaces());
    setProfiles(LocalRoomDatabase.getProfiles());
    setResults(LocalRoomDatabase.getResults());
    setAccounts(LocalRoomDatabase.getAccounts());
    setSettings(LocalRoomDatabase.getSettings());

    const engine = BatchQueueEngine.getInstance();
    const unsubscribe = engine.subscribe((updatedJobs) => {
      setJobs(updatedJobs);
      setQueueRunning(engine.getIsRunning());
      setQueuePaused(engine.getIsPaused());
      setResults(LocalRoomDatabase.getResults());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggleQueue = () => {
    const engine = BatchQueueEngine.getInstance();
    if (queuePaused) {
      engine.resumeQueue();
    } else {
      engine.pauseQueue();
    }
    setQueueRunning(engine.getIsRunning());
    setQueuePaused(engine.getIsPaused());
  };

  const handleClearAllData = () => {
    LocalRoomDatabase.clearAllData();
    setJobs([]);
    setResults([]);
  };

  const handleImportBackup = (backup: any) => {
    if (backup.spaces && Array.isArray(backup.spaces) && backup.spaces.length > 0) {
      const merged = [...spaces];
      for (const sp of backup.spaces) {
        if (!merged.some(s => s.id === sp.id)) merged.push(sp);
      }
      LocalRoomDatabase.saveSpaces(merged);
      setSpaces(merged);
    }

    if (backup.profiles && Array.isArray(backup.profiles) && backup.profiles.length > 0) {
      const merged = [...profiles];
      for (const pr of backup.profiles) {
        if (!merged.some(p => p.id === pr.id)) merged.push(pr);
      }
      LocalRoomDatabase.saveProfiles(merged);
      setProfiles(merged);
    }

    if (backup.jobs && Array.isArray(backup.jobs) && backup.jobs.length > 0) {
      const merged = [...jobs, ...backup.jobs];
      LocalRoomDatabase.saveJobs(merged);
      setJobs(merged);
    }
  };

  const queuedCount = jobs.filter(j => j.status === 'QUEUED').length;

  // View router
  const renderScreenContent = () => {
    switch (currentScreen) {
      case 'dashboard':
        return (
          <DashboardView
            jobs={jobs}
            results={results}
            spaces={spaces}
            profiles={profiles}
            accounts={accounts}
            onNewBatchClick={() => setIsBatchDialogOpen(true)}
            onNavigate={setCurrentScreen}
            onSelectResult={setPreviewResult}
          />
        );
      case 'spaces':
        return (
          <SpacesView
            spaces={spaces}
            onSpacesChange={setSpaces}
            onNewBatchWithSpace={() => setIsBatchDialogOpen(true)}
          />
        );
      case 'profiles':
        return (
          <ProfilesView
            profiles={profiles}
            spaces={spaces}
            onProfilesChange={setProfiles}
            onLaunchBatchWithProfile={() => setIsBatchDialogOpen(true)}
          />
        );
      case 'queue':
        return (
          <QueueView
            jobs={jobs}
            spaces={spaces}
            queueRunning={queueRunning}
            queuePaused={queuePaused}
            onToggleQueue={handleToggleQueue}
            onNewBatchClick={() => setIsBatchDialogOpen(true)}
          />
        );
      case 'results':
        return (
          <ResultsView
            results={results}
            onResultsChange={setResults}
            onSelectResult={setPreviewResult}
          />
        );
      case 'accounts':
        return (
          <AccountsView
            accounts={accounts}
            onAccountsChange={setAccounts}
          />
        );
      case 'settings':
        return (
          <SettingsView
            settings={settings}
            onSettingsChange={setSettings}
            onClearAllData={handleClearAllData}
            jobs={jobs}
            results={results}
            profiles={profiles}
            spaces={spaces}
            onImportBackup={handleImportBackup}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-400 selection:text-neutral-950">
      {/* Top App Bar */}
      <TopAppBar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        isAndroidFrame={isAndroidFrame}
        onToggleFrame={() => setIsAndroidFrame(!isAndroidFrame)}
        queueRunning={queueRunning}
        queuePaused={queuePaused}
        queuedCount={queuedCount}
        onNewBatchClick={() => setIsBatchDialogOpen(true)}
        onToggleQueue={handleToggleQueue}
      />

      {/* Main Workspace Frame */}
      {isAndroidFrame ? (
        // Android Phone Frame Simulation
        <div className="flex-1 flex items-center justify-center p-4 bg-neutral-900/50">
          <div className="w-full max-w-[420px] h-[840px] max-h-[92vh] bg-neutral-950 rounded-[40px] border-4 border-neutral-700 shadow-2xl flex flex-col overflow-hidden relative">
            {/* Android Status Bar Notch */}
            <div className="h-6 bg-neutral-950 flex items-center justify-between px-6 shrink-0 text-[11px] font-mono text-neutral-400 select-none">
              <span>09:41</span>
              <div className="w-20 h-4 bg-neutral-900 rounded-full mx-auto" />
              <span>5G · 100%</span>
            </div>

            {/* Inner Content Viewport */}
            <main className="flex-1 overflow-y-auto">
              {renderScreenContent()}
            </main>

            {/* Android Navigation Bar */}
            <MobileBottomBar
              currentScreen={currentScreen}
              onNavigate={setCurrentScreen}
              queuedCount={queuedCount}
            />

            {/* Android Home Bar */}
            <div className="h-4 bg-neutral-950 flex items-center justify-center shrink-0">
              <div className="w-32 h-1 bg-neutral-600 rounded-full" />
            </div>
          </div>
        </div>
      ) : (
        // Full Desktop SaaS & Studio Canvas
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Rail for large screens */}
          <div className="hidden lg:block">
            <NavigationRail
              currentScreen={currentScreen}
              onNavigate={setCurrentScreen}
              queuedCount={queuedCount}
            />
          </div>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto">
            {renderScreenContent()}
          </main>
        </div>
      )}

      {/* Mobile Bottom Bar when not in simulated frame and on small screen */}
      {!isAndroidFrame && (
        <div className="lg:hidden">
          <MobileBottomBar
            currentScreen={currentScreen}
            onNavigate={setCurrentScreen}
            queuedCount={queuedCount}
          />
        </div>
      )}

      {/* Modals & Dialogs */}
      <BatchCreationDialog
        isOpen={isBatchDialogOpen}
        onClose={() => setIsBatchDialogOpen(false)}
        profiles={profiles}
        spaces={spaces}
      />

      <MediaPreviewModal
        result={previewResult}
        onClose={() => setPreviewResult(null)}
      />
    </div>
  );
}
