import { SymbolType } from '../GameData/SymbolType';
import { IWinResultData } from '../GameData/WinResultData';
import { GameConfig } from '../GameUtility/GameConfig';
import { MIN_WIN_MATCH_COUNT, WinMatchCount } from '../GameData/WinRule';

// 依照設定的 Payline 判斷盤面中所有中獎結果
export class SpinResultChecker
{
    // 檢查每條 Payline 並回傳所有符合最低連線數的結果
    public CheckWinResults( slotGrids: SymbolType[][] ): IWinResultData[]
    {
        const winResults: IWinResultData[] = [];

        for ( const payline of GameConfig.GetInstance().Paylines )
        {
            const winResult: IWinResultData | null = this.checkPayline( slotGrids, payline );

            if ( winResult !== null )
            {
                winResults.push( winResult );
            }
        }

        return winResults;
    }

    // 從第一軸開始向右連續比對相同 Symbol，遇到不同 Symbol 時停止
    private checkPayline( slotGrids: SymbolType[][], payline: number[] ): IWinResultData | null
    {
        const firstSymbol: SymbolType = slotGrids[ 0 ][ payline[ 0 ] ];
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

        if ( matchCount < MIN_WIN_MATCH_COUNT )
        {
            return null;
        }

        const winResult: IWinResultData = {
            SymbolType: firstSymbol,
            MatchCount: matchCount as WinMatchCount,
            WinningPositions: winningPositions,
        };

        return winResult;
    }
}
