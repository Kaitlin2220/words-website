import re
import json
import os

# 1. 确保你的单词文本文件名为 word_list_full.txt
INPUT_FILE = 'word_list_full.txt'
# 2. 输出改为 .js 文件，直接给网页用，避免跨域报错
OUTPUT_FILE = 'word_data.js'

def parse_and_generate_js(file_path):
    word_data = {}
    current_book = "九年级全一册" # 默认兜底
    current_unit = "Unit 1"
    
    # 正则表达式库
    # 书名：匹配 "七年级上册词汇表" 或 "Unit 1" 这种层级
    book_pattern = re.compile(r'([七八九]年级)([上下]册|全一册)')
    unit_pattern = re.compile(r'^Unit\s*(\d+|l)', re.IGNORECASE)
    
    # 词性纠错表 (处理 OCR 里的空格)
    pos_fix_map = {
        'ad v.': 'adv.', 'pro n.': 'pron.', 'p ro': 'pron.',
        'p rep.': 'prep.', 'c onj.': 'conj.', 'v .': 'v.',
        'n .': 'n.', 'adj .': 'adj.'
    }

    if not os.path.exists(file_path):
        print(f"❌ 错误：找不到文件 '{file_path}'")
        return None

    print("--- 开始解析 ---")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    for line in lines:
        line = line.strip()
        if not line or "学科网" in line: continue
        
        # --- 1. 识别书名 ---
        book_match = book_pattern.search(line)
        if book_match:
            current_book = book_match.group(0).replace("词汇表", "")
            print(f"📘 发现教材: {current_book}")
            continue
            
        # --- 2. 识别单元 ---
        unit_match = unit_pattern.match(line)
        if unit_match:
            # 修正 'l' 为 '1' (OCR常见错误 Unit l)
            u_num = unit_match.group(1).lower().replace('l', '1')
            current_unit = f"Unit {u_num}"
            continue
            
        # --- 3. 识别单词行 (核心逻辑) ---
        # 预处理：修复断裂的词性
        for wrong, right in pos_fix_map.items():
            line = line.replace(wrong, right)
            
        process_content_line(line, word_data, f"{current_book}_{current_unit}")

    # 统计
    total = sum(len(v) for v in word_data.values())
    print("-" * 30)
    print(f"✅ 解析完成！共提取 {total} 个单词。")
    
    return word_data

def process_content_line(text, data_dict, key):
    # 过滤掉纯页码或干扰符
    if re.match(r'^\d+$', text): return

    # 策略 A: 标准格式 "单词 POS 释义" (支持一行多个)
    # 正则逻辑：(单词) (空格) (词性.) (空格) (释义)
    # 使用 finditer 循环查找一行中所有的匹配项
    standard_regex = r'(\*?[a-zA-Z\s\(\)\’\'\-\/]+?)\s+(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|num\.|art\.|int\.|det\.|modal v\.|v\.&n\.|[a-z]+\.)\s*(.*?)(?=\s+\*?[a-zA-Z]+\s+[a-z]+\.|$)'
    
    matches = list(re.finditer(standard_regex, text))
    
    # 策略 B: 短语格式 "短语 释义" (没有词性标记)
    # 只有当策略 A 没找到任何东西，且这行看起来像英文开头时才尝试
    if not matches:
        # 匹配：(英文开头) (至少2个空格) (非英文内容)
        phrase_match = re.match(r'^(\*?[a-zA-Z\s\(\)\’\'\-\/]+?)\s{2,}([^a-z].*)$', text)
        if not phrase_match:
             # 宽松匹配：(英文) (空格) (中文/全角符号)
             phrase_match = re.match(r'^(\*?[a-zA-Z\s\(\)\’\'\-\/]+?)\s+([\u4e00-\u9fa5（].*)$', text)
        
        if phrase_match:
            word = phrase_match.group(1).strip()
            trans = phrase_match.group(2).strip()
            # 过滤掉误判的标题行
            if "Unit" not in word and "词汇表" not in trans:
                add_to_dict(data_dict, key, word, "", trans)
            return

    # 处理标准匹配
    for match in matches:
        word = match.group(1).strip()
        pos = match.group(2).strip()
        trans = match.group(3).strip()
        add_to_dict(data_dict, key, word, pos, trans)

def add_to_dict(data_dict, key, word, pos, trans):
    if key not in data_dict:
        data_dict[key] = []
    
    # 清洗：去掉单词里的 * 号
    clean_word = word.replace('*', '')
    if not clean_word: return

    # 去重
    for item in data_dict[key]:
        if item['word'] == clean_word:
            return

    data_dict[key].append({
        "word": clean_word,
        "pos": pos,
        "translation": trans,
        "phonetic": "" # 暂无音标
    })

if __name__ == '__main__':
    data = parse_and_generate_js(INPUT_FILE)
    if data:
        # 写入 .js 文件，赋值给全局变量 window.wordData
        js_content = f"window.wordData = {json.dumps(data, ensure_ascii=False, indent=2)};"
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            f.write(js_content)
        print(f"\n💾 数据已保存到 {OUTPUT_FILE}")
        print("👉 请在 index.html, practice.html, games.html 中引入此文件！")