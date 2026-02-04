import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'

/**
 * Font selector with search/filter capability
 * Supports both dropdown selection and direct text input
 */
export default function FontSelector({ value, onChange, fonts, placeholder = '选择或输入字体名称' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [inputValue, setInputValue] = useState('')
  const dropdownRef = useRef(null)

  // Get the font name from path
  const getDisplayName = (fontPath) => {
    if (!fontPath) return ''
    const font = fonts?.find(f => f.path === fontPath)
    return font ? `${font.name}${font.chinese_support ? ' 🇨🇳' : ''}` : fontPath
  }

  // Initialize input value
  useEffect(() => {
    setInputValue(value ? getDisplayName(value) : '')
  }, [value, fonts])

  // Filter fonts based on search query
  const filteredFonts = fonts?.filter(font => {
    const query = searchQuery.toLowerCase()
    return font.name.toLowerCase().includes(query) || 
           font.path.toLowerCase().includes(query)
  }) || []

  // Separate Chinese and non-Chinese fonts
  const chineseFonts = filteredFonts.filter(f => f.chinese_support)
  const otherFonts = filteredFonts.filter(f => !f.chinese_support)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelectFont = (fontPath) => {
    onChange(fontPath)
    setInputValue(getDisplayName(fontPath))
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Try to find exact match or partial match
    const exactMatch = fonts?.find(f => f.name === newValue || f.path === newValue)
    if (exactMatch) {
      onChange(exactMatch.path)
    } else {
      // Allow custom font path input
      onChange(newValue)
    }
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    setSearchQuery(inputValue)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input field */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown list */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden flex flex-col">
          {/* Search box */}
          <div className="p-2 border-b bg-gray-50">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索字体..."
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Font list */}
          <div className="overflow-y-auto">
            {/* Auto-detect option */}
            <button
              type="button"
              onClick={() => handleSelectFont('')}
              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 border-b"
            >
              自动检测（中文优先）
            </button>

            {/* Chinese fonts */}
            {chineseFonts.length > 0 && (
              <>
                <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 sticky top-0">
                  中文字体 ({chineseFonts.length})
                </div>
                {chineseFonts.map(font => (
                  <button
                    key={font.path}
                    type="button"
                    onClick={() => handleSelectFont(font.path)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                      value === font.path ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    {font.name} 🇨🇳
                  </button>
                ))}
              </>
            )}

            {/* Other fonts */}
            {otherFonts.length > 0 && (
              <>
                <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 sticky top-0">
                  其他字体 ({otherFonts.length})
                </div>
                {otherFonts.map(font => (
                  <button
                    key={font.path}
                    type="button"
                    onClick={() => handleSelectFont(font.path)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                      value === font.path ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    {font.name}
                  </button>
                ))}
              </>
            )}

            {/* No results */}
            {filteredFonts.length === 0 && searchQuery && (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                未找到匹配的字体
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
