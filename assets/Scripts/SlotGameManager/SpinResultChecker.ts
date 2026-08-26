import { SymbolType } from '../GameData/SymbolType';
import { ILineResultData } from '../GameData/LineResultData';
import { ISymbolMultiplier } from '../GameData/SymbolMultiplier';
import { GameConfig } from '../GameUtility/GameConfig';

// 依照設定的 Payline 判斷盤面中所有中獎線
export class SpinResultChecker
{
    // 檢查所有 Payline 並回傳中獎的連線結果
    public CheckLineResults( slotGrids: SymbolType[][] ): ILineResultData[]
    {
        const paylines: number[][] = GameConfig.GetInstance().Paylines;
        const symbolMultipliers: ISymbolMultiplier[] = GameConfig.GetInstance().SymbolMultipliers;
        const lineResults: ILineResultData[] = [];

        for ( let paylineIndex: number = 0; paylineIndex < paylines.length; paylineIndex++ )
        {
            const lineResult: ILineResultData | null = this.checkPayline( slotGrids, paylines[ paylineIndex ], paylineIndex, symbolMultipliers );

            if ( lineResult !== null )
            {
                lineResults.push( lineResult );
            }
        }

        return lineResults;
    }

    // 從第一軸開始向右連續比對相同 Symbol，遇到不同 Symbol 時停止
    private checkPayline( slotGrids: SymbolType[][], payline: number[], paylineIndex: number, symbolMultipliers: ISymbolMultiplier[] ): ILineResultData | null
    {
        const firstSymbol: SymbolType = slotGrids[ 0 ][ payline[ 0 ] ];
        const symbolMultiplier: ISymbolMultiplier | undefined = symbolMultipliers.find( ( configuredMultiplier: ISymbolMultiplier ): boolean => configuredMultiplier.SymbolType === firstSymbol );

        if ( symbolMultiplier === undefined )
        {
            throw new Error( `[SpinResultChecker] 找不到 ${SymbolType[ firstSymbol ]} 的倍率設定。` );
        }

        let matchCount: number = 1;
        const winningPositions = [ { ReelIndex: 0, RowIndex: payline[ 0 ] } ];

        for ( let reelIndex: number = 1; reelIndex < payline.length; reelIndex++ )
        {
            const rowIndex: number = payline[ reelIndex ];
            const currentSymbol: SymbolType = slotGrids[ reelIndex ][ rowIndex ];

            if ( currentSymbol === firstSymbol )
            {
                matchCount++;
                winningPositions.push( { ReelIndex: reelIndex, RowIndex: rowIndex } );
            }
            else
            {
                break;
            }
        }

        // 以倍率設定中的最小連線數作為此 Symbol 的中獎門檻
        const minimumMatchCount: number = Math.min( ...Object.keys( symbolMultiplier.Multipliers ).map( ( configuredMatchCount: string ): number => Number( configuredMatchCount ) ) );

        if ( matchCount < minimumMatchCount )
        {
            return null;
        }

        // 先建立連線結果，Score 由 ScoreCalculator 計算
        const lineResult: ILineResultData = {
            PaylineIndex: paylineIndex,
            SymbolType: firstSymbol,
            MatchCount: matchCount,
            WinningPositions: winningPositions,
            Score: 0,
        };

        return lineResult;
    }
}
