import React from 'react';

const CollectionThemeLayout = ({ themes, favoriteThemeId, renderThemeContent }) => {
    // Threshold for when a theme should be full-width
    const FULL_WIDTH_THRESHOLD = 7;
    
    // First, determine which themes would naturally be full-width based on set count
    const themesWithWidthInfo = themes.map(theme => ({
        ...theme,
        naturallyFullWidth: theme.sets.length >= FULL_WIDTH_THRESHOLD
    }));
    
    // Then, calculate final layout considering edge cases
    const themesWithLayout = themesWithWidthInfo.map((theme, index, array) => {
        // If this is the only theme, it should be full width regardless of set count
        if (array.length === 1) {
            return { ...theme, isFullWidth: true };
        }
        
        // Special case: If there are exactly two themes and both are naturally half-width,
        // keep them both half-width for balance
        if (array.length === 2 && 
            !theme.naturallyFullWidth && 
            !array[0].naturallyFullWidth && 
            !array[1].naturallyFullWidth) {
            return { ...theme, isFullWidth: false };
        }
        
        // If naturally full width, keep it that way
        if (theme.naturallyFullWidth) {
            return { ...theme, isFullWidth: true };
        }
        
        // Get previous and next themes that would be naturally full width
        const prevFullWidthIndex = array.slice(0, index).findLastIndex(t => t.naturallyFullWidth);
        const nextFullWidthIndex = array.slice(index + 1).findIndex(t => t.naturallyFullWidth) + index + 1;
        
        // If this theme is between two full-width themes, make it full width
        if (prevFullWidthIndex !== -1 && nextFullWidthIndex !== -1 && nextFullWidthIndex !== index) {
            return { ...theme, isFullWidth: true };
        }
        
        // Handle orphaned half-width themes
        const isOdd = index % 2 === 1;
        const nextTheme = array[index + 1];
        const prevTheme = array[index - 1];
        
        // If this is the last theme and the previous theme was half-width,
        // or if this is an odd-indexed theme with no next theme,
        // make it full width to avoid orphaning
        if ((!nextTheme && !prevTheme?.naturallyFullWidth) || 
            (!nextTheme && isOdd)) {
            return { ...theme, isFullWidth: true };
        }
        
        // Default to half width
        return { ...theme, isFullWidth: false };
    });

    return (
        <div className="flex flex-wrap gap-8">
            {themesWithLayout.map(theme => (
                <div 
                    key={theme.theme_id}
                    className={`${
                        !theme.isFullWidth ? 'w-full lg:w-[calc(50%-1rem)]' : 'w-full'
                    } bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden`}
                >
                    {renderThemeContent(theme)}
                </div>
            ))}
        </div>
    );
};

export default CollectionThemeLayout;