import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, CheckCheck, FileText, Image, LogOut, MessageCircle, MoreVertical,
  Paperclip, Search, Send, X
} from 'lucide-react';
import {
  getAdminConversations, getAdminMessages, getClientMessages,
  sendAdminMessage, sendClientMessage
} from './api.js';
import './chat.css';
import { allyLabel } from './ally-label.js';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const LUXCAR_AVATAR = { src: '/avatarmensajeria/avatar-luxcar.png', alt: 'Lux Car' };

const clientWelcome = [
  {
    id: 'welcome',
    sender: 'luxcar',
    text: 'Hola, somos Lux Car. Escríbenos si necesitas ayuda con equipamiento, servicios o accesorios para tu flota.',
    time: '09:30'
  }
];

function formatTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}

function formatListTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return formatTime(value);
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit' }).format(date);
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeMessage(message) {
  const attachment = message.attachments?.[0];
  return {
    id: message.id,
    own: message.own,
    text: message.text,
    time: formatTime(message.createdAt),
    attachment: attachment ? { ...attachment, size: formatBytes(attachment.sizeBytes) } : null
  };
}

function getBrandLogo(slug) {
  if (slug === 'ford') return '/avatarmensajeria/avatar-ford.png';
  if (slug === 'chevrolet') return '/avatarmensajeria/avatar-chevrolet.png';
  return null;
}

function createPendingMessage(text, file, conversationId = null) {
  return {
    id: `pending-${Date.now()}-${Math.random()}`,
    conversationId,
    own: true,
    pending: true,
    text,
    time: '',
    attachment: file ? {
      kind: 'document',
      name: file.name,
      size: formatBytes(file.size),
      url: null
    } : null
  };
}

function BrandAvatar({ initials, color, large = false, logoUrl, slug, name = 'Cliente' }) {
  const logo = logoUrl || getBrandLogo(slug);
  return (
    <span className={`chat-avatar${large ? ' large' : ''}${logo ? ' has-logo' : ''}`} style={{ '--avatar-color': color }}>
      {logo ? <img src={logo} alt={name} /> : initials}
    </span>
  );
}

function MessageAvatar({ avatar }) {
  return (
    <span className="message-avatar" title={avatar.alt}>
      {avatar.src ? <img src={avatar.src} alt={avatar.alt} /> : <strong>{avatar.alt.slice(0, 2).toUpperCase()}</strong>}
    </span>
  );
}

function Attachment({ attachment }) {
  if (attachment.kind === 'image' && attachment.url) {
    return (
      <a className="message-image" href={attachment.url} target="_blank" rel="noreferrer" title="Abrir imagen">
        <img src={attachment.url} alt={attachment.name} />
        <span><Image size={15} />{attachment.name}</span>
      </a>
    );
  }
  const content = (
    <>
      <span><FileText size={20} /></span>
      <div><strong>{attachment.name}</strong><small>{attachment.size}</small></div>
    </>
  );
  if (attachment.url) {
    return <a className="message-file" href={attachment.url} target="_blank" rel="noreferrer" title="Abrir archivo">{content}</a>;
  }
  return (
    <div className="message-file">
      {content}
    </div>
  );
}

function MessageBubble({ message, outgoing, avatars }) {
  const avatar = outgoing ? avatars.outgoing : avatars.incoming;
  const bubble = (
    <div className="message-bubble">
      {message.attachment && <Attachment attachment={message.attachment} />}
      {message.text && <p>{message.text}</p>}
      <span className="message-time">
        {message.pending ? <><span className="message-pending-spinner" />Enviando</> : <>{message.time}{outgoing && <CheckCheck size={14} />}</>}
      </span>
    </div>
  );
  return (
    <div className={`message-row ${outgoing ? 'outgoing' : 'incoming'}`}>
      {!outgoing && <MessageAvatar avatar={avatar} />}
      {bubble}
      {outgoing && <MessageAvatar avatar={avatar} />}
    </div>
  );
}

function MessageComposer({ onSend, placeholder }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const selectFile = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    if (selectedFile && selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setError('El archivo no puede superar los 20 MB.');
      event.target.value = '';
      return;
    }
    setFile(selectedFile);
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    const cleanText = text.trim();
    if (!cleanText && !file) return;
    setSending(true);
    setError('');
    setText('');
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
    try {
      await onSend({ text: cleanText, file });
    } catch (requestError) {
      setText(cleanText);
      setFile(file);
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="message-composer" onSubmit={submit}>
      {error && <p className="composer-error" role="alert">{error}</p>}
      {file && (
        <div className="pending-file">
          {file.type.startsWith('image/') ? <Image size={16} /> : <FileText size={16} />}
          <span>{file.name}</span>
          <button type="button" disabled={sending} onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ''; }} aria-label="Quitar archivo" title="Quitar archivo"><X size={15} /></button>
        </div>
      )}
      <div className="composer-row">
        <input ref={inputRef} type="file" hidden accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" onChange={selectFile} />
        <button className="composer-icon" type="button" disabled={sending} onClick={() => inputRef.current?.click()} aria-label="Adjuntar archivo" title="Adjuntar imagen, PDF o Word"><Paperclip size={20} /></button>
        <input value={text} disabled={sending} onChange={(event) => setText(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
        <button className="send-button" type="submit" disabled={sending || (!text.trim() && !file)} aria-label="Enviar mensaje" title="Enviar mensaje">{sending ? <span className="send-spinner" /> : <Send size={19} />}</button>
      </div>
    </form>
  );
}

function ConversationBody({ messages, loading, error, avatars }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  return (
    <div className="messages-scroll" ref={scrollRef}>
      {loading && <div className="conversation-loading" role="status"><span className="chat-loading-spinner" /><small>Cargando conversación...</small></div>}
      {!loading && error && !messages.length && <div className="conversation-state error">{error}</div>}
      {messages.length > 0 && <div className="conversation-date"><span>Hoy</span></div>}
      {messages.map((message) => <MessageBubble key={message.id} message={message} outgoing={message.own} avatars={avatars} />)}
    </div>
  );
}

export function ClientMessaging({ page, nombre, onBack, onLogout }) {
  const [messages, setMessages] = useState(clientWelcome);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await getClientMessages();
      const loadedMessages = (response.data.messages || []).map(normalizeMessage);
      setMessages((current) => [...clientWelcome, ...loadedMessages, ...current.filter((message) => message.pending)]);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
    const interval = window.setInterval(() => loadMessages(true), 4000);
    return () => window.clearInterval(interval);
  }, [loadMessages]);

  const sendMessage = async ({ text, file }) => {
    const pendingMessage = createPendingMessage(text, file);
    setMessages((current) => [...current, pendingMessage]);
    try {
      await sendClientMessage(text, file);
      await loadMessages(true);
    } finally {
      setMessages((current) => current.filter((message) => message.id !== pendingMessage.id));
    }
  };

  return (
    <main className="admin-chat-shell client-messaging-shell">
      <header className="admin-topbar">
        <div className="admin-brand client-page-brand">
          <img src="/Logos/Logo LuxCar.png" alt="Lux Car" />
          <span />
          <img className={`client-partner-logo ${page.id}`} src={page.logo} alt={page.name} />
        </div>
        <div className="admin-account">
          <span><strong>{allyLabel(nombre)} {nombre}</strong><small>Mensajería</small></span>
          <button type="button" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={20} /></button>
        </div>
      </header>
      <section className="client-page-thread" aria-label="Conversación con Lux Car Equipamiento">
        <header className="chat-thread-header">
          <button className="thread-icon" type="button" onClick={onBack} aria-label="Volver al portal" title="Volver al portal"><ArrowLeft size={21} /></button>
          <div className="lux-chat-avatar"><img src={LUXCAR_AVATAR.src} alt={LUXCAR_AVATAR.alt} /></div>
          <div className="thread-person"><strong>Lux Car Equipamiento</strong><span><i />{error ? 'Reconectando...' : 'Atención corporativa'}</span></div>
        </header>
        <ConversationBody
          messages={messages}
          loading={loading}
          error={error}
          avatars={{ incoming: LUXCAR_AVATAR, outgoing: { src: page.logo, alt: page.name } }}
        />
        <MessageComposer onSend={sendMessage} placeholder="Escribe un mensaje a Lux Car" />
      </section>
    </main>
  );
}

export function AdminMessaging({ profile, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [showMobileThread, setShowMobileThread] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [threadError, setThreadError] = useState('');
  const activeConversationRef = useRef(null);
  const selected = conversations.find((conversation) => conversation.id === selectedId) || null;

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setListLoading(true);
    try {
      const response = await getAdminConversations();
      const items = response.data || [];
      setConversations(items);
      setSelectedId((current) => current && items.some((item) => item.id === current) ? current : items[0]?.id || null);
      setListError('');
    } catch (requestError) {
      setListError(requestError.message);
    } finally {
      if (!silent) setListLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (conversationId, silent = false) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    if (!silent) setThreadLoading(true);
    try {
      const response = await getAdminMessages(conversationId);
      if (activeConversationRef.current !== conversationId) return;
      const loadedMessages = (response.data.messages || []).map(normalizeMessage);
      setMessages((current) => [
        ...loadedMessages,
        ...current.filter((message) => message.pending && message.conversationId === conversationId)
      ]);
      setConversations((current) => current.map((conversation) => (
        conversation.id === conversationId ? { ...conversation, unread: 0 } : conversation
      )));
      setThreadError('');
    } catch (requestError) {
      if (activeConversationRef.current === conversationId) setThreadError(requestError.message);
    } finally {
      if (!silent && activeConversationRef.current === conversationId) setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const interval = window.setInterval(() => loadConversations(true), 5000);
    return () => window.clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    activeConversationRef.current = selectedId;
    if (!selectedId) return undefined;
    setMessages([]);
    setThreadError('');
    loadThread(selectedId);
    const interval = window.setInterval(() => loadThread(selectedId, true), 3500);
    return () => window.clearInterval(interval);
  }, [loadThread, selectedId]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    if (!query) return conversations;
    return conversations.filter((conversation) => `${conversation.company} ${conversation.contact}`.toLocaleLowerCase('es').includes(query));
  }, [conversations, search]);
  const unreadTotal = conversations.reduce((total, conversation) => total + conversation.unread, 0);

  const selectConversation = (id) => {
    if (id === selectedId) {
      setShowMobileThread(true);
      return;
    }
    activeConversationRef.current = id;
    setMessages([]);
    setThreadError('');
    setThreadLoading(true);
    setSelectedId(id);
    setShowMobileThread(true);
  };

  const sendMessage = async ({ text, file }) => {
    const conversationId = selectedId;
    const pendingMessage = createPendingMessage(text, file, conversationId);
    setMessages((current) => [...current, pendingMessage]);
    try {
      await sendAdminMessage(conversationId, text, file);
      await Promise.all([loadThread(conversationId, true), loadConversations(true)]);
    } finally {
      setMessages((current) => current.filter((message) => message.id !== pendingMessage.id));
    }
  };

  return (
    <main className="admin-chat-shell">
      <header className="admin-topbar">
        <div className="admin-brand">
          <img src="/Logos/Logo LuxCar.png" alt="Lux Car" />
          <span />
          <div><small>Panel administrativo</small><strong>Mensajería</strong></div>
        </div>
        <div className="admin-account">
          <span><strong>{profile?.nombre || 'Administrador'}</strong><small>Administrador</small></span>
          <button type="button" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={20} /></button>
        </div>
      </header>
      <div className={`admin-chat-workspace${showMobileThread ? ' thread-open' : ''}`}>
        <aside className="conversation-sidebar" aria-label="Conversaciones de clientes">
          <div className="inbox-heading">
            <div><span>Atención al cliente</span><h1>Conversaciones</h1></div>
            {unreadTotal > 0 && <strong>{unreadTotal}</strong>}
          </div>
          <label className="conversation-search">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar empresa o contacto" />
          </label>
          <div className="conversation-list">
            {filtered.length ? filtered.map((conversation) => (
              <button type="button" className={conversation.id === selectedId ? 'active' : ''} onClick={() => selectConversation(conversation.id)} key={conversation.id}>
                <BrandAvatar initials={conversation.initials} color={conversation.color} logoUrl={conversation.logoUrl} slug={conversation.slug} name={conversation.company} />
                <span className="conversation-preview">
                  <span><strong>{conversation.contact}</strong><time>{formatListTime(conversation.lastMessageAt)}</time></span>
                  <span><small>{conversation.company} · {conversation.lastMessage}</small>{conversation.unread > 0 && <b>{conversation.unread}</b>}</span>
                </span>
              </button>
            )) : <p className="conversation-empty">{listLoading ? 'Cargando conversaciones...' : listError || (search ? 'No se encontraron conversaciones.' : 'Aún no hay conversaciones.')}</p>}
          </div>
        </aside>
        {selected ? (
          <section className="admin-thread" aria-label={`Conversación con ${selected.company}`}>
            <header className="chat-thread-header">
              <button className="thread-icon mobile-back" type="button" onClick={() => setShowMobileThread(false)} aria-label="Volver a conversaciones" title="Volver"><ArrowLeft size={21} /></button>
              <BrandAvatar initials={selected.initials} color={selected.color} logoUrl={selected.logoUrl} slug={selected.slug} name={selected.company} large />
              <div className="thread-person"><strong>{selected.contact}</strong><span>{selected.company} · Cliente corporativo</span></div>
              <button className="thread-icon" type="button" aria-label="Opciones de conversación" title="Opciones"><MoreVertical size={21} /></button>
            </header>
            <ConversationBody
              messages={messages}
              loading={threadLoading}
              error={threadError}
              avatars={{
                incoming: { src: selected.logoUrl || getBrandLogo(selected.slug), alt: selected.company },
                outgoing: LUXCAR_AVATAR
              }}
            />
            <MessageComposer onSend={sendMessage} placeholder={`Responder a ${selected.company}`} />
          </section>
        ) : (
          <section className="admin-thread empty-thread">
            <MessageCircle size={36} />
            <strong>Sin conversaciones</strong>
            <span>Las empresas aparecerán aquí después de enviar su primer mensaje.</span>
          </section>
        )}
      </div>
    </main>
  );
}
