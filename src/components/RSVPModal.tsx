import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { InvitationConfig } from '../data/invitation.config';

interface RSVPModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: InvitationConfig;
}

export function RSVPModal({ isOpen, onClose, config }: RSVPModalProps) {
  const [name, setName] = useState('');
  const [rsvp, setRsvp] = useState(config.rsvp.rsvpOptions[0]);
  const [guests, setGuests] = useState('1 guest');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const r = config.rsvp;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="modal-card"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          >
            <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

            <p className="modal-couple">
              {config.groom.firstName} &amp; {config.bride.firstName}
            </p>
            <h2 className="modal-heading">{r.heading}</h2>
            <p className="modal-desc">{r.description}</p>

            {saved ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  textAlign: 'center',
                  padding: '24px 0',
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '22px',
                  fontStyle: 'italic',
                  color: '#2a2420',
                }}
              >
                Saved. See you there. ✦
              </motion.div>
            ) : (
              <form className="modal-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="rsvp-name">Your name</label>
                  <input
                    id="rsvp-name"
                    className="form-input"
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="rsvp-status">Will you join us?</label>
                  <select
                    id="rsvp-status"
                    className="form-select"
                    value={rsvp}
                    onChange={e => setRsvp(e.target.value)}
                  >
                    {r.rsvpOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="rsvp-guests">Number of guests</label>
                  <input
                    id="rsvp-guests"
                    className="form-input"
                    type="text"
                    placeholder="1 guest"
                    value={guests}
                    onChange={e => setGuests(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="rsvp-note">A little note</label>
                  <textarea
                    id="rsvp-note"
                    className="form-textarea"
                    placeholder="A blessing, dietary needs, or anything you'd like us to know"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </div>

                <button type="submit" className="form-submit">
                  {r.ctaButton} <span>→</span>
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

