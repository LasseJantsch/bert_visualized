'use client'
import TextElement from "@/(components)/textElement";
import { useState, useEffect, useRef, useCallback, act } from 'react'
import { AutoTokenizer } from '@xenova/transformers';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
const Main = () => {
  const [inputText, setInputText] = useState<string>('')
  const [inputText2, setInputText2] = useState<string>('')
  const [tokens, setTokens] = useState<any>()
  const [encodings, setEncodings] = useState<any>()
  const [maskedTokens, setMaskedTokens] = useState<any>()
  const [maskedEncodings, setMaskedEncodings] = useState<any>()
  const [maskedEncodingTypes, setMaskedEncodingTypes] = useState<any>()
  const [firstProps, setFirstProps] = useState<any>()
  const [lastProps, setLastProps] = useState<any>()
  const [maxEnc, setMaxEnc] = useState<any>()
  const [maxToken, setMaxToken] = useState<any>()
  const [predProb, setPredProb] = useState<any>()

  const [activeMode, setActiveMode] =useState<string>('mlm')

  const [maskProb, setMaskProb] = useState<number>(30)
  const [randProb, setRandProb] = useState<number>(20)
  const [sameProb, setSameProb] = useState<number>(20)
  const [tokenProb, setTokenProb] = useState<number>(60)

  const [ready, setReady] = useState<boolean>();

  const worker: any = useRef(null);

  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module'
      });
    }
  
    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e:any) => { 
      const d = e.data
      switch (d.status) {
        case 'initiate':
          setReady(false);
          break;
        case 'ready':
          setReady(true);
          break;
        case 'complete':
          switch(d.type) {
            case 'masking':
              setReady(true)
              setTokens(d.tokens)
              setEncodings(d.encodings)
              setMaskedEncodings(d.masked_encodings)
              setMaskedTokens(d.masked_tokens)
              setMaskedEncodingTypes(d.masked_encoding_types)
              break
            case 'resolving':
              setReady(true)
              setFirstProps(d.first_probs)
              setLastProps(d.last_probs)
              setMaxEnc(d.max_enc)
              setMaxToken(d.max_token)
              break;
            case 'next_sentence':
              setReady(true)
              setTokens(d.tokens)
              setEncodings(d.encodings)
              setFirstProps(d.first_probs)
              setLastProps(d.last_probs)
              setPredProb(d.prob_pred)
          }
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => worker.current.removeEventListener('message', onMessageReceived);
  });

  const classify = useCallback((text:string,  type:string, mode:string, options?:any) => {
    if (worker.current) {
      if (mode === 'mlm') {
        if (type === 'masking') {
          setFirstProps(null)
          setLastProps(null)
          setMaxEnc(null)
          setMaxToken(null)
        }
        worker.current.postMessage({
          'content': text,
          'type': type,
          'mode': mode,
          'options': options
        });  
      } else {
        worker.current.postMessage({
          'content': text + ' [SEP] ' +  options,
          'type': 'next_sentence',
          'mode': mode,
        });  
      }
    }
  }, []);

  const replaceMasked: any = (original:any[], new_: any[], type: any[])=>{
    let res = []
    for (let i=0; i<original.length; i++) {
      if (type[i] === 0) {
        res.push(original[i])
      } else {
        res.push(new_[i])
      }
    }
    return res
  }

  const handleModeChangge = () => {
    setInputText('')
    setTokens(null)
    setEncodings(null)
    setMaskedTokens(null)
    setMaskedEncodings(null)
    setMaskedEncodingTypes(null)
    setFirstProps(null)
    setLastProps(null)
    setMaxEnc(null)
    setMaxToken(null)
    setPredProb(null)
    activeMode === 'mlm' ? setActiveMode('nsp'): setActiveMode('mlm')

    
  }

  return(
    <div className="page_container">
      <div className="toggle_select">
        <label className="switch">
        <input className='toggle_input' type="checkbox" id="togBtn" onChange={handleModeChangge}/>
        <div className="slider round"></div>
        </label>
      </div>
      <div className="input_container row_container">
        <div className="description_container"><div className="description_element">Input Sentence </div></div>
        <div className="content_container">
          <textarea
            className="text_input"
            placeholder="Enter text here"
            value={inputText}
            onInput={(e:any) => {
              setInputText(e.target.value);
          }}
          />
          { activeMode === 'mlm' ? <div className="options row_container">
            <label className="option_input_label">Masking (%)</label>
            <input className="option_input" type="number"  value={maskProb} min={0} max={30} onChange={(e:any)=>setMaskProb(e.target.value)}/>
            <label className="option_input_label">[MASK] Token (%)</label>
            <input className="option_input" type="number" value={tokenProb} min={0} max={100 - randProb - sameProb} onChange={(e:any)=>setTokenProb(e.target.value)}/>
            <label className="option_input_label">Random Token (%)</label>
            <input className="option_input" type="number" value={randProb} min={0} max={100- tokenProb - sameProb} onChange={(e:any)=>setRandProb(e.target.value)}/>
            <label className="option_input_label">Same Token (%)</label>
            <input className="option_input" type="number" value={sameProb} min={0} max={100 - tokenProb - randProb} onChange={(e:any)=>setSameProb(e.target.value)}/>
          </div>:
           <textarea
           className="text_input"
           placeholder="Enter text here"
           value={inputText2}
           onInput={(e:any) => {
             setInputText2(e.target.value);
         }}/>
          }
        </div>
        <div className="action_container">
          <button 
            className="submit_button"
            onClick={(e:any) => {
              classify(
                inputText,
                'masking',
                activeMode,
                activeMode==='mlm' ? {
                  'masking':maskProb,
                  'token': tokenProb,
                  'rand': randProb,
                  'same': sameProb,
                }: inputText2
              );
            }}
          >
            <ArrowForwardIcon/>
          </button>
        </div>
      </div>

      <div className="tokenizer_container row_container">
      <div className="description_container"><div className="description_element">Tokenizer Output</div></div>
        <div className="content_container">
        {ready !== null && (
        <pre className="text_element_container">
          { (!ready || !tokens) ? 
          'Loading...' : 
          <div className="col_container">
            <TextElement data={tokens}/>
            <TextElement data={encodings}/>
          </div>
          }
        </pre>
      )}
        </div>
        <div className="action_container">
        </div>
      </div>


      {activeMode==='mlm' && <div className="mask_container row_container">
      <div className="description_container"><div className="description_element">Masked Sentence</div></div>
        <div className="content_container">
        {ready !== null && (
        <pre className="text_element_container">
            { (!ready || !maskedTokens) ? 
            'Loading...' : 
            <div className="col_container">
              <TextElement data={maskedTokens} color={maskedEncodingTypes}/>
              <TextElement data={maskedEncodings} color={maskedEncodingTypes}/>
            </div>
            }
          </pre>
        )}
        </div>
        <div className="action_container">
          <button 
            className="submit_button"
            onClick={(e:any) => {
              classify(
                maskedEncodings,
                'resolving',
                activeMode,
              );
            }}
          >
            <ArrowForwardIcon/>
          </button>
        </div>
      </div>}

      <div className="bert_emb_container row_container">
      <div className="description_container"><div className="description_element">{activeMode==='mlm'? 'BERT Predictions': 'BERT CLS Embedding'}</div></div>
        <div className="content_container">
        {ready !== null && (
        <pre className="text_element_container">
          { (!ready || !firstProps) ? 
          'Loading...' : 
          <div className="col_container">
            <TextElement data={firstProps} color={maskedEncodingTypes}/>
            <TextElement data={Array.from({ length: firstProps.length }, (x, i) => '...')} color={maskedEncodingTypes}/>
            {activeMode==='mlm'? '+ 30518 Rows +': ' + 764 Rows +'}
            <TextElement data={Array.from({ length: firstProps.length }, (x, i) => '...')} color={maskedEncodingTypes}/>
            <TextElement data={lastProps} color={maskedEncodingTypes}/>
          </div>
          }
        </pre>
      )}
        </div>
        <div className="action_container">
          {/* <button 
            className="submit_button"
            onClick={(e:any) => {
              
            }}
          >
            <ArrowForwardIcon/>
          </button> */}
        </div>
      </div>

      { activeMode === 'mlm' && <div className="bert_emb_container row_container">
      <div className="description_container"><div className="description_element">Resolved masks</div></div>
        <div className="content_container">
        {ready !== null && (
        <pre className="text_element_container">
          { (!ready || !maxEnc) ? 
          'Loading...' : 
          <div className="col_container">
            <TextElement data={replaceMasked(maskedEncodings, maxEnc, maskedEncodingTypes)} color={maskedEncodingTypes}/>
            <TextElement data={replaceMasked(maskedTokens, maxToken, maskedEncodingTypes)} color={maskedEncodingTypes}/>
          </div>
          }
        </pre>
      )}
        </div>
        <div className="action_container">
          {/* <button 
            className="submit_button"
            onClick={(e:any) => {
              
            }}
          >
            <ArrowForwardIcon/>
          </button> */}
        </div>
      </div>}

      {activeMode ==='mlm' && <div className="bert_emb_container row_container">
      <div className="description_container"><div className="description_element">Model Loss</div></div>
        <div className="content_container">
        {ready !== null && (
          <pre className="text_element_container">
            { (!ready || !maxToken) ? 
            'Loading...' : 
            <div className="col_container">
              <TextElement data={replaceMasked(maskedTokens, maxToken, maskedEncodingTypes)} color={maskedEncodingTypes}/>
              <TextElement data={tokens}/>
            </div>
            }
          </pre>
        )}
        </div>
        <div className="action_container">
        </div>
      </div>}
        {activeMode ==='nsp' && <div className="bert_emb_container row_container">
        <div className="description_container"><div className="description_element">Model Loss</div></div>
          <div className="content_container">
          {ready !== null && (
            <pre className="text_element_container">
              { (!ready || !predProb) ? 
              'Loading...' : 
              <div className="col_container">
                <TextElement data={['Is Same', predProb[0]]} color={[1,0]}/>
                <TextElement data={['Is not Same', predProb[1]]} color={[2,0]}/>
              </div>
              }
            </pre>
          )}
          </div>
          <div className="action_container">
          </div>
        </div>}
    </div>
  
  )
}

export default Main