// Utility function for combining classes
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Button variants using class-variance-authority pattern
const buttonVariants = {
  variant: {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline"
  },
  size: {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10"
  }
};

// Card variants
const cardVariants = {
  base: "rounded-lg border bg-card text-card-foreground shadow-sm"
};

// Input variants
const inputVariants = {
  base: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
};

// Component creator functions
function createButton(text, options = {}) {
  const button = document.createElement('button');
  const variant = options.variant || 'default';
  const size = options.size || 'default';
  
  button.className = cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    buttonVariants.variant[variant],
    buttonVariants.size[size],
    options.className
  );
  
  if (options.icon) {
    const icon = document.createElement('span');
    icon.innerHTML = options.icon;
    icon.className = "mr-2 h-4 w-4";
    button.appendChild(icon);
  }
  
  button.appendChild(document.createTextNode(text));
  
  if (options.onClick) {
    button.addEventListener('click', options.onClick);
  }
  
  return button;
}

function createCard(options = {}) {
  const card = document.createElement('div');
  card.className = cn(cardVariants.base, options.className);
  return card;
}

function createCardHeader(title, description) {
  const header = document.createElement('div');
  header.className = "flex flex-col space-y-1.5 p-6";
  
  if (title) {
    const titleEl = document.createElement('h3');
    titleEl.className = "text-2xl font-semibold leading-none tracking-tight";
    titleEl.textContent = title;
    header.appendChild(titleEl);
  }
  
  if (description) {
    const descEl = document.createElement('p');
    descEl.className = "text-sm text-muted-foreground";
    descEl.textContent = description;
    header.appendChild(descEl);
  }
  
  return header;
}

function createCardContent(className = "") {
  const content = document.createElement('div');
  content.className = cn("p-6 pt-0", className);
  return content;
}

function createInput(options = {}) {
  const input = document.createElement('input');
  input.className = cn(inputVariants.base, options.className);
  
  if (options.type) input.type = options.type;
  if (options.placeholder) input.placeholder = options.placeholder;
  if (options.value) input.value = options.value;
  
  return input;
}

function createBadge(text, variant = 'default') {
  const badge = document.createElement('span');
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground border border-input bg-background hover:bg-accent hover:text-accent-foreground"
  };
  
  badge.className = cn(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    variants[variant]
  );
  badge.textContent = text;
  return badge;
}

function createSeparator(orientation = 'horizontal') {
  const separator = document.createElement('div');
  separator.className = orientation === 'horizontal' 
    ? "h-[1px] w-full bg-border" 
    : "w-[1px] h-full bg-border";
  return separator;
}

function createProgress(value = 0) {
  const container = document.createElement('div');
  container.className = "relative h-4 w-full overflow-hidden rounded-full bg-secondary";
  
  const indicator = document.createElement('div');
  indicator.className = "h-full w-full flex-1 bg-primary transition-all";
  indicator.style.transform = `translateX(-${100 - value}%)`;
  
  container.appendChild(indicator);
  return { container, indicator };
}

// Export functions for global use
window.shadcnUtils = {
  cn,
  createButton,
  createCard,
  createCardHeader,
  createCardContent,
  createInput,
  createBadge,
  createSeparator,
  createProgress,
  buttonVariants,
  cardVariants,
  inputVariants
};