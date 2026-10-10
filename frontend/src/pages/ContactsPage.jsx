import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import Avatar from '../components/common/Avatar';
import { Plus, Search, Download, Upload, Edit2, Trash2, Users, Mail, Phone, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  GlassCard, GlassButton, GlassModal, GlassInput,
  GlassSelect, GlassTextarea, PageHeader, SkeletonRows
} from '../components/ui';
import EmptyState from '../components/common/EmptyState';

const ContactsPage = () => {
  const { contacts, addContact, updateContact, deleteContact, loading } = useData();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', birthday: '', anniversary: '', phone: '', relationship: 'Friend', notes: ''
  });

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) {
      setSearch(q);
    }
  }, [searchParams]);

  const filteredContacts = (contacts || []).filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.relationship || '').toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingContact(null);
    setFormData({ name: '', email: '', birthday: '', anniversary: '', phone: '', relationship: 'Friend', notes: '' });
    setShowModal(true);
  };

  const openEdit = (contact) => {
    setEditingContact(contact);
    setFormData({ ...contact });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }

    try {
      if (editingContact) {
        await updateContact(editingContact.id, formData);
        toast.success('Contact updated');
      } else {
        await addContact(formData);
        toast.success('Contact added');
      }
      setShowModal(false);
    } catch {
      toast.error('Failed to save contact');
    }
  };

  const handleDelete = async (id, name) => {
    if (confirm(`Delete ${name || 'this contact'}?`)) {
      try {
        await deleteContact(id);
        toast.success('Contact deleted');
      } catch {
        toast.error('Failed to delete contact');
      }
    }
  };

  const exportCSV = () => {
    if (!contacts || !contacts.length) {
      toast.error('No contacts to export');
      return;
    }
    const csv = [
      ['Name', 'Email', 'Phone', 'Birthday', 'Anniversary', 'Relationship', 'Group', 'Tags'],
      ...contacts.map(c => [
        c.name || '',
        c.email || '',
        c.phone || '',
        c.birthday || '',
        c.anniversary || '',
        c.relationship || '',
        c.group || '',
        c.tags || ''
      ])
    ].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    // Prepend UTF-8 BOM for Microsoft Excel compatibility
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'autowish-contacts.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Exported autowish-contacts.csv');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const lines = event.target.result.split('\n').slice(1);
      let count = 0;
      for (const line of lines) {
        if (line.trim()) {
          const parts = line.split(',').map(s => s.replace(/(^"|"$)/g, '').trim());
          const [name, birthday, anniversary, email, phone, relationship] = parts;
          if (name && email) {
            await addContact({ 
              name, 
              email, 
              birthday: birthday || '', 
              anniversary: anniversary || '',
              phone: phone || '',
              relationship: relationship || 'Friend'
            });
            count++;
          }
        }
      }
      toast.success(`${count} contacts imported`);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        subtitle={`Keep track of friends, family and colleagues (${contacts?.length || 0} total).`}
        icon={Users}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="btn-secondary btn-sm cursor-pointer inline-flex items-center gap-1.5">
              <Upload size={14} aria-hidden="true" />
              <span>Import CSV</span>
              <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
            </label>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={exportCSV}
              leftIcon={<Download size={14} />}
            >
              Export
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={openAdd}
              leftIcon={<Plus size={15} />}
            >
              Add Contact
            </GlassButton>
          </div>
        }
      />

      {/* Filter / Search Bar */}
      <GlassCard className="p-3 sm:p-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute top-1/2 -translate-y-1/2 left-3.5 text-slate-500 pointer-events-none" size={16} aria-hidden="true" />
          <input 
            type="text" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search contacts by name, email or relationship..." 
            className="glass-input pl-10 pr-4 py-2 text-sm" 
          />
        </div>
      </GlassCard>

      {/* Content */}
      {loading && contacts.length === 0 ? (
        <GlassCard className="p-6">
          <SkeletonRows rows={6} />
        </GlassCard>
      ) : filteredContacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'No contacts match your query' : 'No contacts yet'}
          description={search ? 'Try adjusting your search criteria or clear the search field.' : 'Add your first contact to start scheduling birthday and anniversary greetings.'}
          actionLabel="Add First Contact"
          onAction={openAdd}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <GlassCard className="overflow-hidden">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-12">Avatar</th>
                      <th>Name</th>
                      <th>Relationship</th>
                      <th>Birthday / Anniversary</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map(contact => (
                      <tr key={contact.id} className="transition-colors">
                        <td>
                          <Avatar name={contact.name} src={contact.avatar} size="sm" />
                        </td>
                        <td className="font-semibold text-fg whitespace-nowrap">
                          {contact.name}
                        </td>
                        <td>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-raised text-slate-400 border border-line-soft">
                            {contact.relationship || 'General'}
                          </span>
                        </td>
                        <td className="text-sm text-slate-300">
                          {contact.birthday && <span className="text-slate-300">{contact.birthday}</span>}
                          {contact.birthday && contact.anniversary && <span className="mx-1 text-slate-500">·</span>}
                          {contact.anniversary && <span className="text-purple-400">💍 {contact.anniversary}</span>}
                          {!contact.birthday && !contact.anniversary && <span className="text-slate-500">—</span>}
                        </td>
                        <td className="text-sm text-slate-300">{contact.email}</td>
                        <td className="text-sm text-slate-400">{contact.phone || '—'}</td>
                        <td className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(contact)}
                              className="btn-ghost btn-icon p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                              title="Edit contact"
                              aria-label={`Edit ${contact.name}`}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(contact.id, contact.name)}
                              className="btn-ghost btn-icon p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                              title="Delete contact"
                              aria-label={`Delete ${contact.name}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>

          {/* Mobile Cards View */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
            {filteredContacts.map(contact => (
              <GlassCard key={contact.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={contact.name} src={contact.avatar} size="md" />
                    <div>
                      <div className="font-semibold text-fg text-sm">{contact.name}</div>
                      <div className="text-xs text-indigo-400 font-medium">{contact.relationship || 'Contact'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(contact)}
                      className="p-1.5 rounded-lg text-blue-400 hover:bg-raised"
                      aria-label={`Edit ${contact.name}`}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(contact.id, contact.name)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-raised"
                      aria-label={`Delete ${contact.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-line-soft">
                  <div className="flex items-center gap-2 truncate">
                    <Mail size={13} className="text-slate-500 shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                  {contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-500 shrink-0" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {(contact.birthday || contact.anniversary) && (
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-slate-500 shrink-0" />
                      <span>
                        {contact.birthday && `Birthday: ${contact.birthday}`}
                        {contact.birthday && contact.anniversary && ' · '}
                        {contact.anniversary && `Anniversary: ${contact.anniversary}`}
                      </span>
                    </div>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit Contact Modal */}
      <GlassModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingContact ? 'Edit Contact' : 'Add New Contact'}
        description={editingContact ? 'Update contact details and dates.' : 'Add a new friend or colleague to your celebration book.'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassInput
              label="Full Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Sarah Jenkins"
            />
            <GlassInput
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="sarah@example.com"
            />
            <GlassInput
              label="Birthday"
              placeholder="Nov 18, 2025"
              value={formData.birthday || ''}
              onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
            />
            <GlassInput
              label="Anniversary"
              placeholder="Jan 15, 2022"
              value={formData.anniversary || ''}
              onChange={(e) => setFormData({ ...formData, anniversary: e.target.value })}
            />
            <GlassInput
              label="Phone Number"
              placeholder="+1 555-0199"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <GlassSelect
              label="Relationship"
              value={formData.relationship || 'Friend'}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
            >
              <option>Friend</option>
              <option>Family</option>
              <option>Colleague</option>
              <option>Client</option>
              <option>Other</option>
            </GlassSelect>
          </div>

          <GlassTextarea
            label="Notes (Optional)"
            rows={2}
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add birthdays preferences, hobbies or special reminders..."
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-line-soft">
            <GlassButton variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="primary" type="submit">
              {editingContact ? 'Save Changes' : 'Create Contact'}
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};

export default ContactsPage;
