import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import Modal from '../components/Modal';
import Avatar from '../components/common/Avatar';
import { Plus, Search, Download, Upload, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ContactsPage = () => {
  const { contacts, addContact, updateContact, deleteContact } = useData();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', birthday: '', anniversary: '', phone: '', relationship: 'Friend', notes: '' });

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase())
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }

    if (editingContact) {
      updateContact(editingContact.id, formData);
      toast.success('Contact updated');
    } else {
      addContact(formData);
      toast.success('Contact added');
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (confirm('Delete this contact?')) {
      deleteContact(id);
      toast.success('Contact deleted');
    }
  };

  const exportCSV = () => {
    const csv = [
      ['Name', 'Birthday', 'Anniversary', 'Email', 'Phone', 'Relationship'],
      ...contacts.map(c => [c.name, c.birthday || '', c.anniversary || '', c.email, c.phone || '', c.relationship])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
    toast.success('Exported contacts.csv');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const lines = event.target.result.split('\n').slice(1);
      let count = 0;
      lines.forEach(line => {
        if (line.trim()) {
          const [name, birthday, anniversary, email] = line.split(',');
          if (name && email) {
            addContact({ 
              name: name.trim(), 
              email: email.trim(), 
              birthday: birthday?.trim() || '', 
              anniversary: anniversary?.trim() || '',
              phone: '',
              relationship: 'Friend'
            });
            count++;
          }
        }
      });
      toast.success(`${count} contacts imported`);
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-sm text-[#94A3B8]">Manage all your contacts and important dates</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="btn-secondary flex items-center gap-2 cursor-pointer text-sm">
            <Upload size={15} /> Import CSV
            <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </label>
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute top-1/2 -translate-y-1/2 left-3.5 text-[#64748B] pointer-events-none" size={16} />
          <input 
            type="text" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search contacts..." 
            className="input pl-11" 
          />
        </div>
      </div>

      {/* Table - Exact match from image */}
      <div className="card overflow-hidden">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Profile</th>
              <th>Name</th>
              <th>Birthday / Anniversary</th>
              <th>Email</th>
              <th className="hidden md:table-cell">Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.length > 0 ? filteredContacts.map(contact => (
              <tr key={contact.id} className="hover:bg-[#1E293B]/60">
                <td>
                  <Avatar name={contact.name} src={contact.avatar} size="sm" />
                </td>
                <td className="font-medium">{contact.name}</td>
                <td className="text-sm">
                  {contact.birthday && <span>{contact.birthday}</span>}
                  {contact.anniversary && <span className="ml-2 text-purple-400">• {contact.anniversary}</span>}
                </td>
                <td className="text-sm text-[#CBD5E1]">{contact.email}</td>
                <td className="hidden md:table-cell text-sm text-[#94A3B8]">{contact.phone || '—'}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(contact)} className="p-2 hover:bg-[#334155] rounded-lg">
                      <Edit2 size={16} className="text-blue-400" />
                    </button>
                    <button onClick={() => handleDelete(contact.id)} className="p-2 hover:bg-[#334155] rounded-lg">
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="6" className="py-8 text-center text-[#64748B]">No contacts found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingContact ? "Edit Contact" : "Add New Contact"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">Full Name</label>
              <input name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input" required />
            </div>
            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">Email</label>
              <input name="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="input" required />
            </div>
            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">Birthday</label>
              <input name="birthday" value={formData.birthday} onChange={(e) => setFormData({...formData, birthday: e.target.value})} placeholder="Nov 18, 2025" className="input" />
            </div>
            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">Anniversary</label>
              <input name="anniversary" value={formData.anniversary} onChange={(e) => setFormData({...formData, anniversary: e.target.value})} placeholder="Jan 15, 2022" className="input" />
            </div>
            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">Phone</label>
              <input name="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="input" />
            </div>
            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">Relationship</label>
              <select name="relationship" value={formData.relationship} onChange={(e) => setFormData({...formData, relationship: e.target.value})} className="input">
                <option>Friend</option>
                <option>Family</option>
                <option>Colleague</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] mb-1 block">Notes</label>
            <textarea name="notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="input h-20 resize-y" placeholder="Optional notes"></textarea>
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingContact ? 'Save Changes' : 'Add Contact'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ContactsPage;
