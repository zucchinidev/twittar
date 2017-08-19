import parseHTML from './../../utils/parseHTML';
import toastTemplate from './../../../../templates/toast.hbs';
import defaults from 'lodash/object/defaults';
import transition from 'simple-transition';
import closest from 'closest';

function Toast(text, duration, buttons) {
  const toast = this;

  this.container = parseHTML(toastTemplate({
    text: text,
    buttons: buttons
  })).firstChild;

  this.answer = new Promise(function(resolve) {
    toast._answerResolver = resolve;
  });

  this.gone = new Promise(function(resolve) {
    toast._goneResolver = resolve;
  });

  if (duration) {
    this._hideTimeout = setTimeout(function() {
      toast.hide();
    }, duration);
  }

  this.container.addEventListener('click', function(event) {
    const button = closest(event.target, 'button', true);
    if (!button) {
      return;
    }
    toast._answerResolver(button.textContent);
    toast.hide();
  });
}

Toast.prototype.hide = function() {
  clearTimeout(this._hideTimeout);
  this._answerResolver();

  transition(this.container, {
    opacity: 0
  }, 0.3, 'ease-out').then(this._goneResolver);
  
  return this.gone;
};

export default function Toasts(appendToEl) {
  this._container = parseHTML('<div class="toasts"></div>').firstChild;
  appendToEl.appendChild(this._container);
}

// Returns a toast.
Toasts.prototype.show = function(message, opts) {
  opts = defaults({}, opts, {
    duration: 0,
    buttons: ['dismiss']
  });

  const toast = new Toast(message, opts.duration, opts.buttons);
  this._container.appendChild(toast.container);

  transition(toast.container, {
    opacity: 1
  }, 0.5, 'ease-out');

  toast.gone.then(function() {
    toast.container.parentNode.removeChild(toast.container);
  });

  return toast;
};