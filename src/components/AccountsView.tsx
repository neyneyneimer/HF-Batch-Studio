import React, { useState } from 'react';
import { HFAccount } from '../types';
import { encryptToken, maskToken, validateHfTokenFormat } from '../utils/crypto';
import { LocalRoomDatabase } from '../utils/storage';
import {
  KeyRound,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lock,
  RefreshCw,
  X,
} from 'lucide-react';

interface AccountsViewProps {
  accounts: HFAccount[];
  onAccountsChange: (accounts: HFAccount[]) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  onAccountsChange,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleAddAccount = async () => {
    const val = validateHfTokenFormat(tokenInput);
    if (!val.valid) {
      setValidationError(val.message);
      return;
    }

    setIsEncrypting(true);
    setValidationError(null);

    try {
      const encrypted = await encryptToken(tokenInput);
      const masked = maskToken(tokenInput);

      const newAccount: HFAccount = {
        id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: accountName.trim() || 'Hugging Face Account',
        tokenMasked: masked,
        encryptedTokenHex: encrypted.ciphertextHex,
        ivHex: encrypted.ivHex,
        saltHex: encrypted.saltHex,
        isDefault: accounts.length === 0,
        quotaStatus: 'OK',
        createdAt: Date.now(),
      };

      const updated = [...accounts, newAccount];
      LocalRoomDatabase.saveAccounts(updated);
      onAccountsChange(updated);

      setAccountName('');
      setTokenInput('');
      setIsAddModalOpen(false);
    } catch (err: any) {
      setValidationError(err.message || 'Encryption failed');
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDelete = (id: string) => {
    const updated = accounts.filter(a => a.id !== id);
    LocalRoomDatabase.saveAccounts(updated);
    onAccountsChange(updated);
  };

  const handleSetDefault = (id: string) => {
    const updated = accounts.map(a => ({
      ...a,
      isDefault: a.id === id,
    }));
    LocalRoomDatabase.saveAccounts(updated);
    onAccountsChange(updated);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-100 tracking-tight">
            Credentials & Keystore
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Store Hugging Face User Access Tokens with on-device hardware-backed AES-256-GCM encryption
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add HF Token</span>
        </button>
      </div>

      {/* Security & Non-Cycling Policy Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">
              Hardware Security & Quota Compliance Architecture
            </h3>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              HF Batch Studio complies with Hugging Face terms of service and Android Keystore security standards:
            </p>
            <ul className="mt-2.5 space-y-1.5 text-xs text-neutral-300 list-disc list-inside">
              <li>
                <strong>Encrypted at rest:</strong> Tokens are encrypted using AES-256-GCM with hardware-derived PBKDF2 keys before touching storage.
              </li>
              <li>
                <strong>Zero credential logging:</strong> Raw tokens are never logged to console, disk logs, or error reports. Tokens are masked as <code className="text-amber-400 font-mono">hf_••••xxxx</code>.
              </li>
              <li>
                <strong>No account quota cycling:</strong> The queue engine does not cyclically hop accounts to evade free tier GPU limits. When an account quota is reached, pending jobs are paused until quota reset or explicit user selection.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div className="space-y-3">
        <span className="text-[11px] font-semibold text-neutral-300 tracking-wider block">
          AUTHORIZED CREDENTIALS ({accounts.length})
        </span>

        {accounts.length === 0 ? (
          <div className="p-10 border border-dashed border-neutral-800 rounded-2xl text-center bg-neutral-950 flex flex-col items-center justify-center">
            <KeyRound className="w-8 h-8 text-neutral-600 mb-2" />
            <h4 className="text-xs font-semibold text-neutral-300">
              No Hugging Face tokens configured
            </h4>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm">
              Public spaces without authentication work anonymously. For higher ZeroGPU allocations or private spaces, add an authorized token.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-3 px-4 py-1.5 text-xs font-medium text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
            >
              Add Access Token
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map(acc => (
              <div
                key={acc.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-100">{acc.name}</span>
                      {acc.isDefault && (
                        <span className="text-[10px] font-mono bg-neutral-800 border border-neutral-700 px-1.5 py-0.5 rounded text-amber-400">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      className="text-neutral-500 hover:text-red-400 transition-colors p-1"
                      title="Remove Token"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2 font-mono text-xs text-neutral-300 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="tracking-widest">{acc.tokenMasked}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400">Quota Health:</span>
                    {acc.quotaStatus === 'OK' ? (
                      <span className="text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> OK
                      </span>
                    ) : (
                      <span className="text-amber-400 font-mono flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Exhausted
                      </span>
                    )}
                  </div>

                  {!acc.isDefault && (
                    <button
                      onClick={() => handleSetDefault(acc.id)}
                      className="text-amber-400 hover:underline text-xs"
                    >
                      Set as Default
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                Add Hugging Face Token
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Create a User Access Token in your Hugging Face account settings (read-only is sufficient for public Spaces).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Account / Token Label
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="e.g. Personal HF Pro Account"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Access Token (hf_...)
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 text-xs font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {validationError && (
              <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-lg text-xs text-red-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAccount}
                disabled={isEncrypting || !tokenInput.trim()}
                className="px-5 py-2 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isEncrypting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isEncrypting ? 'Encrypting...' : 'Save & Encrypt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
