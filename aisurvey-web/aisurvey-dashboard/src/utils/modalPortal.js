import { createPortal } from 'react-dom';

export const createModalPortal = (children) => {
    const modalRoot = document.getElementById('modal-root') || document.body;
    return createPortal(children, modalRoot);
};