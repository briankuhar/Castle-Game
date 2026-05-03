document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const gridSize = 60;
    let activeBlock = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // Prevent default touch behaviors (like pull-to-refresh) on the app
    document.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });

    // Handle initial pointer down on palette blocks to create clones
    document.querySelectorAll('.palette-block').forEach(block => {
        block.addEventListener('pointerdown', (e) => {
            // Prevent text selection/default drag
            e.preventDefault();
            
            // Create clone
            const clone = block.cloneNode(true);
            clone.classList.remove('palette-block');
            
            // Get initial position relative to viewport
            const rect = block.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            
            // Set initial position on canvas
            let startX = rect.left - canvasRect.left;
            let startY = rect.top - canvasRect.top;
            
            clone.style.left = `${startX}px`;
            clone.style.top = `${startY}px`;
            
            canvas.appendChild(clone);
            
            // Start dragging
            startDrag(clone, e);
        });
    });

    // Handle grabbing blocks already on the canvas
    canvas.addEventListener('pointerdown', (e) => {
        const block = e.target.closest('.block');
        if (block && !block.classList.contains('palette-block')) {
            startDrag(block, e);
        }
    });

    function startDrag(block, e) {
        e.preventDefault();
        activeBlock = block;
        activeBlock.classList.add('dragging');
        
        // Calculate offset between pointer and block top-left
        const rect = activeBlock.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        
        // Bring to front
        const highestZIndex = Array.from(canvas.children).reduce((max, el) => {
            if (el === activeBlock) return max;
            return Math.max(max, parseInt(getComputedStyle(el).zIndex) || 1);
        }, 1);
        activeBlock.style.zIndex = highestZIndex + 1;

        // Capture pointer events on the window to ensure we don't lose drag if moving fast
        window.addEventListener('pointermove', onDrag);
        window.addEventListener('pointerup', endDrag);
        window.addEventListener('pointercancel', endDrag);
    }

    function onDrag(e) {
        if (!activeBlock) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        
        // Calculate new position relative to canvas
        let newX = e.clientX - canvasRect.left - dragOffsetX;
        let newY = e.clientY - canvasRect.top - dragOffsetY;
        
        activeBlock.style.left = `${newX}px`;
        activeBlock.style.top = `${newY}px`;
    }

    function endDrag(e) {
        if (!activeBlock) return;
        
        window.removeEventListener('pointermove', onDrag);
        window.removeEventListener('pointerup', endDrag);
        window.removeEventListener('pointercancel', endDrag);

        // Check if dropped outside canvas or over palette
        const palette = document.getElementById('palette');
        const paletteRect = palette.getBoundingClientRect();
        
        // If the center of the block is over the palette, delete it
        const rect = activeBlock.getBoundingClientRect();
        const blockCenterY = rect.top + rect.height / 2;
        
        if (blockCenterY > paletteRect.top) {
            // Dropped on palette, delete the block
            activeBlock.remove();
            activeBlock = null;
            return;
        }

        // Remove dragging class to re-enable CSS transitions
        activeBlock.classList.remove('dragging');
        
        // Snap to grid
        const currentX = parseFloat(activeBlock.style.left);
        const currentY = parseFloat(activeBlock.style.top);
        
        let snappedX = Math.round(currentX / gridSize) * gridSize;
        let snappedY = Math.round(currentY / gridSize) * gridSize;
        
        activeBlock.style.left = `${snappedX}px`;
        activeBlock.style.top = `${snappedY}px`;
        
        activeBlock = null;
    }
});
