import sys, re
from lxml import etree
import os; SWR = os.environ.get('SW_ROOT', '/home/claude')   # 작업 공간 뿌리 — 맥 등은 SW_ROOT로 바꿈
xsd = open(os.path.join(SWR, 'work/xsd/musicxml.xsd'), 'rb').read()
xsd = re.sub(rb'schemaLocation="[^"]*xml\.xsd"', b'schemaLocation="' + os.path.join(SWR, 'work/xsd/xml.xsd').encode() + b'"', xsd)
xsd = re.sub(rb'schemaLocation="[^"]*xlink\.xsd"', b'schemaLocation="' + os.path.join(SWR, 'work/xsd/xlink.xsd').encode() + b'"', xsd)
schema = etree.XMLSchema(etree.fromstring(xsd, base_url=os.path.join(SWR, 'work/xsd/')))
for f in sys.argv[1:]:
    doc = etree.parse(f, etree.XMLParser(load_dtd=False, no_network=True, resolve_entities=False))
    ok = schema.validate(doc)
    errs = list(schema.error_log)
    from collections import Counter
    c = Counter(re.sub(r"line \d+", "", e.message)[:160] for e in errs)
    print(f, 'VALID' if ok else f'INVALID {len(errs)}')
    for m, n in c.most_common(6): print('   ', n, m)
