import sys,zipfile,re,glob,collections,json
sys.path.insert(0,'.')
import inspect_ooxml_state as I
R='(?:CLR|NSWLR|ALR|ALJR|FCR|FLR|VR|Qd R|SASR|WAR|LGERA|A Crim R|IR|IPR|ACSR|NSWCCR|Fam LR|ACLC|ATR|DLR|AC|QB|Ch|WLR|All ER|NTLR|ACTLR|Tas R|MVR|BPR|ConvR|NTR|ALD|FamLR|AILR|ASTLR)'
P={
 'report_first_parallel': r'\((?:19|20)\d\d\) \d+ '+R+r' \d+(?:, \d+)?(?: at \[?\d+\]?)?; \[(?:19|20)\d\d\] [A-Z][A-Za-z]+ \d+',
 'mnc_first_parallel': r'\[(?:19|20)\d\d\] [A-Z][A-Za-z]+ \d+(?: at \[\d+\]|, \[\d+\])?; \((?:19|20)\d\d\) \d+ '+R,
 'mnc_pin_at': r'\[(?:19|20)\d\d\] [A-Z][A-Za-z]+ \d+ at \[\d+',
 'mnc_pin_comma': r'\[(?:19|20)\d\d\] [A-Z][A-Za-z]+ \d+, \[\d+',
 'report_pin_at': r'\((?:19|20)\d\d\) \d+ '+R+r' \d+ at \[?\d+',
 'report_pin_comma': r'\((?:19|20)\d\d\) \d+ '+R+r' \d+, \[?\d+',
 'shorttitle_paren_noquote': r'(?:\d|\])\]? \((?!(?:NSW|Cth|Vic|Qld|WA|SA|Tas|ACT|NT|NZ|UK|No \d)\))([A-Z][A-Za-z’\']+(?: [A-Z][A-Za-z’\']+)?)\)(?! J\b)(?<!J\))(?<!JA\))(?<!CJ\))(?<!JJ\))',
 'mnc_first_parallel_noyear': r'\[(?:19|20)\d\d\] [A-Z][A-Za-z]+ \d+; \d+ '+R+r' \d+',
 'per_judge_inline': r'\bper [A-Z][a-z]+ (?:CJ|J|JA|JJ|ACJ|AJ)\b',
 'shorttitle_paren_quoted': r'\([‘\'“"][A-Z]',
 'per_attribution': r'\(per [A-Z]',
 'judge_paren_noper': r'\((?:[A-Z][a-z]+ (?:CJ|J|JA|JJ|P|ACJ|AJ|AJA|DCJ|SC DCJ)(?:,? )?)+[^)]{0,40}\)',
 'ibid': r'\b[Ii]bid\b',
 'n_xref': r'\(n \d+\)',
 'above_n': r'\babove(?: at)? n \d+|\bsupra\b',
 'short_name_at_para': r'\b[A-Z][a-z]+ at \[\d+\]',
 'bare_at_para_start': r'(?:^|\. )At \[\d+\]',
 'transcript_T': r'\bT ?\d+\.\d+',
 'Tcpt': r'\bTcpt\b',
 'CB_ref': r'\bCB\b',
 'exhibit': r'\bExh(?:ibit)? ',
 'submissions_abbrev': r'\b(?:PS|DS|RS|AS|PWS|DWS|AWS|RWS|PSS|FRS|RS1)\b ?(?:at )?\[',
}
def texts(f):
    z=zipfile.ZipFile(f)
    d=z.read('word/document.xml').decode()
    try: fn=z.read('word/footnotes.xml').decode()
    except KeyError: fn=''
    return ' '.join(I.para_texts(d)), I.notes_text(fn,'footnote')
def run(files,label):
    c=collections.Counter(); docs=collections.Counter()
    for f in files:
        b,fns=texts(f)
        for loc,t in (('body',b),('fn',' \n '.join(fns))):
            for k,p in P.items():
                n=len(re.findall(p,t,re.M))
                c[loc+':'+k]+=n
                if n: docs[k]+=1
    return c,docs
if __name__=='__main__':
    groups=json.loads(sys.argv[1])
    for label,pat in groups.items():
        files=sorted(glob.glob(pat)) if isinstance(pat,str) else pat
        c,d=run(files,label)
        print('##',label,'docs=',len(files))
        for k in P: print('  %-26s body=%-5d fn=%-5d docs_with=%d'%(k,c['body:'+k],c['fn:'+k],d[k]))
